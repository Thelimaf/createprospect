import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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

    console.log('Incrementing search usage for user:', user.id);

    // Get user subscription with plan
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*, subscription_plans!inner(*)')
      .eq('user_id', user.id)
      .single();

    if (subError || !subscription) {
      console.error('Subscription not found:', subError);
      return new Response(
        JSON.stringify({ error: 'Assinatura não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current usage
    const { data: usage } = await supabase
      .from('user_usage')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const planSlug = subscription.subscription_plans.slug;
    const now = new Date().toISOString();

    if (planSlug === 'free') {
      // FREE plan: increment lifetime counter (NEVER resets)
      const newLifetimeCount = (usage?.searches_used_lifetime || 0) + 1;
      
      console.log('Incrementing FREE lifetime usage to:', newLifetimeCount);

      await supabase
        .from('user_usage')
        .upsert({
          user_id: user.id,
          searches_used_lifetime: newLifetimeCount,
          last_search_at: now,
        }, { onConflict: 'user_id' });

      return new Response(
        JSON.stringify({ 
          success: true, 
          plan: 'free',
          searches_used_lifetime: newLifetimeCount,
          remaining: Math.max(0, 3 - newLifetimeCount)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (planSlug === 'starter') {
      // STARTER plan: increment monthly counter
      const newMonthlyCount = (usage?.searches_used_monthly || 0) + 1;
      
      console.log('Incrementing STARTER monthly usage to:', newMonthlyCount);

      await supabase
        .from('user_usage')
        .upsert({
          user_id: user.id,
          searches_used_monthly: newMonthlyCount,
          searches_used_lifetime: (usage?.searches_used_lifetime || 0) + 1, // Also track lifetime for stats
          last_search_at: now,
        }, { onConflict: 'user_id' });

      return new Response(
        JSON.stringify({ 
          success: true, 
          plan: 'starter',
          searches_used_monthly: newMonthlyCount,
          remaining: Math.max(0, 100 - newMonthlyCount)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Plano não reconhecido' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in increment-search-usage:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
