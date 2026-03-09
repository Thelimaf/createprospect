import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Emails com acesso master (sem limites)
const MASTER_EMAILS = ['anderson.ferlimajunior@gmail.com'];

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Validate JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se é usuário master (sem limites)
    if (MASTER_EMAILS.includes(user.email || '')) {
      console.log('Master user detected:', user.email);
      return new Response(
        JSON.stringify({ 
          allowed: true, 
          plan_name: 'master',
          remaining_searches: 999999,
          current_usage: 0,
          limit: 999999,
          message: null
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Checking limits for user:', user.id);

    // Get user profile to check beta tester status
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_beta_tester, created_at')
      .eq('id', user.id)
      .single();

    // Get user usage
    const { data: usage } = await supabase
      .from('user_usage')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Beta testers get UNLIMITED access for 30 days after signup
    if (profile?.is_beta_tester) {
      const createdAt = new Date(profile.created_at);
      const expiresAt = new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000);
      const now = new Date();
      const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      
      if (now < expiresAt) {
        console.log('Beta tester - unlimited access, expires in', daysRemaining, 'days:', user.id);
        
        return new Response(
          JSON.stringify({ 
            allowed: true,
            plan_name: 'beta_tester',
            remaining_searches: 999999,
            current_usage: usage?.searches_used_monthly || 0,
            limit: 999999,
            days_remaining: daysRemaining,
            expires_at: expiresAt.toISOString(),
            message: null
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        console.log('Beta tester period expired for user:', user.id);
        // Continue to check regular subscription below
      }
    }

    // Get user subscription with plan
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*, subscription_plans!inner(*)')
      .eq('user_id', user.id)
      .single();

    if (subError || !subscription) {
      console.error('Subscription not found:', subError);
      return new Response(
        JSON.stringify({ 
          allowed: false, 
          plan_name: 'free',
          remaining_searches: 0,
          current_usage: 0,
          limit: 3,
          message: 'Assinatura não encontrada' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const plan = subscription.subscription_plans;
    const planSlug = plan.slug;
    const limits = plan.limits as { searches_lifetime?: number; searches_monthly?: number };

    console.log('User plan:', planSlug, 'Status:', subscription.status);

    // Check if subscription is paused (payment failed)
    if (subscription.status === 'paused') {
      return new Response(
        JSON.stringify({ 
          allowed: false, 
          plan_name: planSlug,
          remaining_searches: 0,
          current_usage: planSlug === 'free' ? (usage?.searches_used_lifetime || 0) : (usage?.searches_used_monthly || 0),
          limit: planSlug === 'free' ? 3 : 100,
          message: 'Sua assinatura está pausada por falta de pagamento',
          payment_required: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (planSlug === 'free') {
      // FREE plan: check lifetime searches
      const lifetimeLimit = limits.searches_lifetime || 3;
      const used = usage?.searches_used_lifetime || 0;
      const remaining = Math.max(0, lifetimeLimit - used);
      const allowed = used < lifetimeLimit;

      console.log('FREE plan - Used:', used, 'Limit:', lifetimeLimit, 'Allowed:', allowed);

      return new Response(
        JSON.stringify({ 
          allowed, 
          plan_name: 'free',
          remaining_searches: remaining,
          current_usage: used,
          limit: lifetimeLimit,
          is_last_search: used === lifetimeLimit - 1,
          message: allowed 
            ? (used === lifetimeLimit - 1 ? 'Esta é sua última busca grátis!' : null)
            : 'Você atingiu o limite de 3 buscas do plano Free'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (planSlug === 'starter') {
      // STARTER plan: check monthly searches
      const monthlyLimit = limits.searches_monthly || 100;
      
      // Check if we need to reset monthly usage
      let monthlyUsed = usage?.searches_used_monthly || 0;
      
      if (usage?.reset_date && new Date(usage.reset_date) <= new Date()) {
        // Reset the counter
        console.log('Resetting monthly usage for user:', user.id);
        await supabase
          .from('user_usage')
          .update({
            searches_used_monthly: 0,
            reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .eq('user_id', user.id);
        monthlyUsed = 0;
      }

      const remaining = Math.max(0, monthlyLimit - monthlyUsed);
      const allowed = monthlyUsed < monthlyLimit;

      console.log('STARTER plan - Used:', monthlyUsed, 'Limit:', monthlyLimit, 'Allowed:', allowed);

      return new Response(
        JSON.stringify({ 
          allowed, 
          plan_name: 'starter',
          remaining_searches: remaining,
          current_usage: monthlyUsed,
          limit: monthlyLimit,
          renewal_date: subscription.current_period_end,
          message: allowed ? null : 'Você atingiu o limite de 100 buscas deste mês'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fallback
    return new Response(
      JSON.stringify({ 
        allowed: false, 
        plan_name: planSlug,
        remaining_searches: 0,
        current_usage: 0,
        limit: 0,
        message: 'Plano não reconhecido' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-user-limits:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
