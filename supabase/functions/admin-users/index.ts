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

      // Get subscriptions
      const { data: subscriptions, error: subError } = await supabaseAdmin
        .from('user_subscriptions')
        .select('*, subscription_plans(*)');

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
          searches_used_lifetime: userUsage?.searches_used_lifetime || 0,
          searches_used_monthly: userUsage?.searches_used_monthly || 0,
          subscription_id: userSub?.id || null,
          plan_id: userSub?.plan_id || null,
        };
      });

      console.log(`Returning ${users.length} users`);
      return new Response(
        JSON.stringify({ users }),
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
        // Check if subscription exists
        const { data: existingSub } = await supabaseAdmin
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (existingSub) {
          // Update existing subscription
          const { error: updateError } = await supabaseAdmin
            .from('user_subscriptions')
            .update({
              plan_id: starterPlan.id,
              status: 'active',
              current_period_start: new Date().toISOString(),
              current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);

          if (updateError) {
            console.error('Error updating subscription:', updateError);
            return new Response(
              JSON.stringify({ error: 'Erro ao atualizar assinatura' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } else {
          // Create new subscription
          const { error: insertError } = await supabaseAdmin
            .from('user_subscriptions')
            .insert({
              user_id: userId,
              plan_id: starterPlan.id,
              status: 'active',
              current_period_start: new Date().toISOString(),
              current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            });

          if (insertError) {
            console.error('Error inserting subscription:', insertError);
            return new Response(
              JSON.stringify({ error: 'Erro ao criar assinatura' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }

        // Reset monthly usage for new starter user
        await supabaseAdmin
          .from('user_usage')
          .update({ 
            searches_used_monthly: 0,
            reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .eq('user_id', userId);

        console.log(`User ${userId} upgraded to Starter`);
        return new Response(
          JSON.stringify({ success: true, message: 'Usuário promovido para Starter' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (action === 'downgrade') {
        const { error: updateError } = await supabaseAdmin
          .from('user_subscriptions')
          .update({
            plan_id: freePlan.id,
            status: 'active',
            current_period_start: null,
            current_period_end: null,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (updateError) {
          console.error('Error downgrading subscription:', updateError);
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
