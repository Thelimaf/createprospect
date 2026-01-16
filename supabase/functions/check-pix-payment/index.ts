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
    const abacateApiKey = Deno.env.get('ABACATE_PAY_API_KEY');

    if (!abacateApiKey) {
      console.error('ABACATE_PAY_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Configuração de pagamento não encontrada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // Get charge_id from request
    const { charge_id } = await req.json();

    if (!charge_id) {
      return new Response(
        JSON.stringify({ error: 'ID da cobrança é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Checking PIX payment status for:', charge_id);

    // Get payment record
    const { data: payment, error: paymentError } = await supabase
      .from('pix_payments')
      .select('*')
      .eq('abacate_charge_id', charge_id)
      .eq('user_id', user.id)
      .single();

    if (paymentError || !payment) {
      console.error('Payment not found:', paymentError);
      return new Response(
        JSON.stringify({ error: 'Pagamento não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If already paid, return success
    if (payment.status === 'PAID') {
      return new Response(
        JSON.stringify({ status: 'PAID', paid_at: payment.paid_at }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check with Abacate Pay
    const abacateResponse = await fetch(`https://api.abacatepay.com/v1/pixQrCode/check?id=${charge_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${abacateApiKey}`,
      },
    });

    const abacateData = await abacateResponse.json();
    console.log('Abacate Pay check response:', JSON.stringify(abacateData));

    if (!abacateResponse.ok) {
      console.error('Abacate Pay error:', abacateData);
      return new Response(
        JSON.stringify({ status: payment.status }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const currentStatus = abacateData.data?.status || payment.status;

    // If payment is now PAID, upgrade user
    if (currentStatus === 'PAID' && payment.status !== 'PAID') {
      console.log('Payment confirmed! Upgrading user:', user.id);

      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setDate(periodEnd.getDate() + 30);

      // Update payment status
      await supabase
        .from('pix_payments')
        .update({
          status: 'PAID',
          paid_at: now.toISOString(),
        })
        .eq('id', payment.id);

      // Get starter plan ID
      const { data: starterPlan } = await supabase
        .from('subscription_plans')
        .select('id')
        .eq('slug', 'starter')
        .single();

      if (starterPlan) {
        // Update subscription to starter
        await supabase
          .from('user_subscriptions')
          .update({
            plan_id: starterPlan.id,
            status: 'active',
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
          })
          .eq('user_id', user.id);

        // Reset monthly usage
        await supabase
          .from('user_usage')
          .update({
            searches_used_monthly: 0,
            reset_date: periodEnd.toISOString(),
          })
          .eq('user_id', user.id);
      }

      console.log('User upgraded successfully');

      return new Response(
        JSON.stringify({ 
          status: 'PAID', 
          paid_at: now.toISOString(),
          upgraded: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if expired
    if (payment.expires_at && new Date(payment.expires_at) < new Date()) {
      if (payment.status !== 'EXPIRED') {
        await supabase
          .from('pix_payments')
          .update({ status: 'EXPIRED' })
          .eq('id', payment.id);
      }
      return new Response(
        JSON.stringify({ status: 'EXPIRED' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ status: currentStatus }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-pix-payment:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
