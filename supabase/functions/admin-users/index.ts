import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MASTER_EMAIL = 'anderson.ferlimajunior@gmail.com';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify master user
    if (user.email !== MASTER_EMAIL) {
      console.log('Access denied for:', user.email);
      return new Response(
        JSON.stringify({ error: 'Acesso negado - apenas administradores' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Admin access granted for:', user.email);

    if (req.method === 'GET') {
      // List all users with their subscriptions and usage
      const { data: authUsers, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (usersError) {
        console.error('Error listing users:', usersError);
        return new Response(
          JSON.stringify({ error: 'Erro ao listar usuários' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get subscriptions (including upgrade_source)
      const { data: subscriptions, error: subError } = await supabaseAdmin
        .from('user_subscriptions')
        .select('*, subscription_plans(*), upgrade_source');

      if (subError) {
        console.error('Error fetching subscriptions:', subError);
      }

      // Get usage
      const { data: usage, error: usageError } = await supabaseAdmin
        .from('user_usage')
        .select('*');

      if (usageError) {
        console.error('Error fetching usage:', usageError);
      }

      // Get leads count per user
      const { data: leadsPerUser, error: leadsPerUserError } = await supabaseAdmin
        .from('google_maps_leads')
        .select('user_id');

      if (leadsPerUserError) {
        console.error('Error fetching leads per user:', leadsPerUserError);
      }

      // Count leads per user
      const leadsCountMap: Record<string, number> = {};
      leadsPerUser?.forEach((lead) => {
        leadsCountMap[lead.user_id] = (leadsCountMap[lead.user_id] || 0) + 1;
      });

      // Get last activity (last lead or search) per user
      const { data: lastSearches } = await supabaseAdmin
        .from('google_maps_searches')
        .select('user_id, created_at')
        .order('created_at', { ascending: false });

      const lastActivityMap: Record<string, string> = {};
      lastSearches?.forEach((search) => {
        if (!lastActivityMap[search.user_id]) {
          lastActivityMap[search.user_id] = search.created_at || '';
        }
      });

      // Merge data
      const users = authUsers.users.map((authUser) => {
        const userSub = subscriptions?.find(s => s.user_id === authUser.id);
        const userUsage = usage?.find(u => u.user_id === authUser.id);
        
        return {
          id: authUser.id,
          email: authUser.email,
          full_name: authUser.user_metadata?.full_name || null,
          created_at: authUser.created_at,
          plan: userSub?.subscription_plans?.slug || 'free',
          plan_name: userSub?.subscription_plans?.name || 'Free',
          plan_status: userSub?.status || 'active',
          upgrade_source: userSub?.upgrade_source || null,
          searches_used_lifetime: userUsage?.searches_used_lifetime || 0,
          searches_used_monthly: userUsage?.searches_used_monthly || 0,
          subscription_id: userSub?.id || null,
          plan_id: userSub?.plan_id || null,
          leads_count: leadsCountMap[authUser.id] || 0,
          last_activity: lastActivityMap[authUser.id] || null,
        };
      });

      // ========== STATS ==========
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

      // Payment stats
      const { data: payments } = await supabaseAdmin
        .from('pix_payments')
        .select('amount_brl, status, created_at, paid_at');

      const paidPayments = payments?.filter(p => p.status === 'PAID') || [];
      const paidThisMonth = paidPayments.filter(p => p.paid_at && p.paid_at >= startOfMonth);
      const pendingPayments = payments?.filter(p => p.status === 'PENDING') || [];

      const mrr = paidThisMonth.reduce((sum, p) => sum + (p.amount_brl || 0), 0);
      const totalRevenue = paidPayments.reduce((sum, p) => sum + (p.amount_brl || 0), 0);
      const avgTicket = paidPayments.length > 0 
        ? paidPayments.reduce((sum, p) => sum + (p.amount_brl || 0), 0) / paidPayments.length 
        : 0;

      // Leads stats
      const { count: totalLeads } = await supabaseAdmin
        .from('google_maps_leads')
        .select('*', { count: 'exact', head: true });

      const { count: leadsToday } = await supabaseAdmin
        .from('google_maps_leads')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfToday);

      // Searches stats
      const { count: totalSearches } = await supabaseAdmin
        .from('google_maps_searches')
        .select('*', { count: 'exact', head: true });

      // Campaigns stats
      const { count: totalCampaigns } = await supabaseAdmin
        .from('campaigns')
        .select('*', { count: 'exact', head: true });

      // User counts - separate paid vs courtesy
      const totalUsers = users.length;
      const starterUsers = users.filter(u => u.plan === 'starter').length;
      const starterPaidUsers = users.filter(u => u.plan === 'starter' && u.upgrade_source === 'payment').length;
      const starterCourtesyUsers = users.filter(u => u.plan === 'starter' && u.upgrade_source !== 'payment').length;
      const freeUsers = users.filter(u => u.plan === 'free').length;
      const conversionRate = totalUsers > 0 ? (starterUsers / totalUsers) * 100 : 0;
      const paidConversionRate = totalUsers > 0 ? (starterPaidUsers / totalUsers) * 100 : 0;

      // ========== CHARTS DATA ==========
      // Leads by day (last 30 days)
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: recentLeads } = await supabaseAdmin
        .from('google_maps_leads')
        .select('created_at')
        .gte('created_at', thirtyDaysAgo);

      const leadsByDayMap: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        leadsByDayMap[dateStr] = 0;
      }
      recentLeads?.forEach((lead) => {
        const dateStr = lead.created_at.split('T')[0];
        if (leadsByDayMap[dateStr] !== undefined) {
          leadsByDayMap[dateStr]++;
        }
      });
      const leadsByDay = Object.entries(leadsByDayMap).map(([date, count]) => ({ date, count }));

      // Users by day (last 14 days)
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const usersByDayMap: Record<string, number> = {};
      for (let i = 13; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        usersByDayMap[dateStr] = 0;
      }
      authUsers.users.forEach((u) => {
        const dateStr = u.created_at.split('T')[0];
        if (usersByDayMap[dateStr] !== undefined) {
          usersByDayMap[dateStr]++;
        }
      });
      const usersByDay = Object.entries(usersByDayMap).map(([date, count]) => ({ date, count }));

      const stats = {
        totalUsers,
        starterUsers,
        starterPaidUsers,
        starterCourtesyUsers,
        freeUsers,
        conversionRate: Math.round(conversionRate * 10) / 10,
        paidConversionRate: Math.round(paidConversionRate * 10) / 10,
        totalLeads: totalLeads || 0,
        leadsToday: leadsToday || 0,
        totalSearches: totalSearches || 0,
        totalCampaigns: totalCampaigns || 0,
        mrr,
        totalRevenue,
        pendingPayments: pendingPayments.length,
        avgTicket: Math.round(avgTicket * 100) / 100,
      };

      const charts = {
        leadsByDay,
        usersByDay,
      };

      console.log(`Returning ${users.length} users with stats`);
      return new Response(
        JSON.stringify({ users, stats, charts }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'POST') {
      let body;
      try {
        const text = await req.text();
        body = text ? JSON.parse(text) : {};
      } catch {
        body = {};
      }
      
      const { action, userId } = body;
      
      if (!action || !userId) {
        return new Response(
          JSON.stringify({ error: 'Ação e userId são obrigatórios' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Admin action: ${action} for user: ${userId}`);

      // Get plan IDs
      const { data: plans, error: plansError } = await supabaseAdmin
        .from('subscription_plans')
        .select('*');

      if (plansError || !plans) {
        console.error('Error fetching plans:', plansError);
        return new Response(
          JSON.stringify({ error: 'Erro ao buscar planos' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const freePlan = plans.find(p => p.slug === 'free');
      const starterPlan = plans.find(p => p.slug === 'starter');

      if (!freePlan || !starterPlan) {
        return new Response(
          JSON.stringify({ error: 'Planos não encontrados' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (action === 'upgrade') {
        // UPSERT subscription with upgrade_source = 'admin_grant' (courtesy)
        const { error: upsertError } = await supabaseAdmin
          .from('user_subscriptions')
          .upsert({
            user_id: userId,
            plan_id: starterPlan.id,
            status: 'active',
            upgrade_source: 'admin_grant',
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });

        if (upsertError) {
          console.error('Error upserting subscription:', upsertError);
          return new Response(
            JSON.stringify({ error: 'Erro ao atualizar assinatura' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // UPSERT user_usage to ensure it exists and reset monthly
        const { data: existingUsage } = await supabaseAdmin
          .from('user_usage')
          .select('searches_used_lifetime')
          .eq('user_id', userId)
          .maybeSingle();

        await supabaseAdmin
          .from('user_usage')
          .upsert({ 
            user_id: userId,
            searches_used_monthly: 0,
            searches_used_lifetime: existingUsage?.searches_used_lifetime || 0,
            reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          }, { onConflict: 'user_id' });

        console.log(`User ${userId} upgraded to Starter`);
        return new Response(
          JSON.stringify({ success: true, message: 'Usuário promovido para Starter' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (action === 'downgrade') {
        // UPSERT to ensure subscription exists even if it didn't before
        const { error: upsertError } = await supabaseAdmin
          .from('user_subscriptions')
          .upsert({
            user_id: userId,
            plan_id: freePlan.id,
            status: 'active',
            current_period_start: null,
            current_period_end: null,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });

        if (upsertError) {
          console.error('Error downgrading subscription:', upsertError);
          return new Response(
            JSON.stringify({ error: 'Erro ao rebaixar assinatura' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`User ${userId} downgraded to Free`);
        return new Response(
          JSON.stringify({ success: true, message: 'Usuário rebaixado para Free' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Ação inválida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Método não permitido' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in admin-users:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
