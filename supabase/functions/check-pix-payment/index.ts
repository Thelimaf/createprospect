import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ADMIN_EMAIL = 'anderson.ferlimajunior@gmail.com';

async function sendAdminNotification(
  resendApiKey: string,
  subject: string,
  html: string
) {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'ProspectAI <onboarding@resend.dev>',
        to: [ADMIN_EMAIL],
        subject,
        html,
      }),
    });

    const result = await response.json();
    console.log('Email notification sent:', result);
    return result;
  } catch (error) {
    console.error('Error sending email notification:', error);
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const abacateApiKey = Deno.env.get('ABACATE_PAY_API_KEY');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

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
      // Vitalício: sem data de expiração
      const periodEnd = null;

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
        // Update subscription to starter with upgrade_source = 'payment' (vitalício)
        await supabase
          .from('user_subscriptions')
          .upsert({
            user_id: user.id,
            plan_id: starterPlan.id,
            status: 'active',
            upgrade_source: 'payment',
            current_period_start: now.toISOString(),
            current_period_end: null, // Vitalício - sem expiração
          }, { onConflict: 'user_id' });

        // Reset monthly usage (continua resetando mensalmente)
        const nextReset = new Date(now);
        nextReset.setDate(nextReset.getDate() + 30);
        await supabase
          .from('user_usage')
          .update({
            searches_used_monthly: 0,
            reset_date: nextReset.toISOString(),
          })
          .eq('user_id', user.id);
      }

      console.log('User upgraded successfully');

      // Send admin notification about successful payment
      if (resendApiKey) {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 20px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">💰 VENDA APROVADA!</h1>
            </div>
            <div style="background: #1a1a2e; padding: 24px; border-radius: 0 0 12px 12px; color: #e0e0e0;">
              <div style="background: #22c55e20; border: 1px solid #22c55e; border-radius: 8px; padding: 16px; margin-bottom: 20px; text-align: center;">
                <span style="color: #22c55e; font-size: 32px; font-weight: bold;">R$ 27,90</span>
                <p style="color: #22c55e; margin: 8px 0 0 0;">Pagamento Confirmado ✓</p>
              </div>
              <h2 style="color: #f59e0b; margin-top: 0;">Dados do Cliente</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #9ca3af;">Nome:</td>
                  <td style="padding: 8px 0; color: #fff; font-weight: bold;">${payment.customer_name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #9ca3af;">Email:</td>
                  <td style="padding: 8px 0; color: #fff;">${payment.customer_email}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #9ca3af;">Telefone:</td>
                  <td style="padding: 8px 0; color: #fff;">${payment.customer_phone}</td>
                </tr>
              </table>
              <hr style="border: none; border-top: 1px solid #374151; margin: 16px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #9ca3af;">ID do PIX:</td>
                  <td style="padding: 8px 0; color: #fff; font-family: monospace; font-size: 12px;">${charge_id}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #9ca3af;">User ID:</td>
                  <td style="padding: 8px 0; color: #fff; font-family: monospace; font-size: 12px;">${user.id}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #9ca3af;">Plano:</td>
                  <td style="padding: 8px 0;"><span style="background: #f59e0b; color: #000; padding: 4px 12px; border-radius: 4px; font-weight: bold;">STARTER VITALÍCIO</span></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #9ca3af;">Tipo:</td>
                  <td style="padding: 8px 0; color: #22c55e; font-weight: bold;">ACESSO PERMANENTE</td>
                </tr>
              </table>
              <p style="color: #6b7280; font-size: 12px; margin-top: 24px; text-align: center;">
                ProspectAI - Sistema de Prospecção Inteligente
              </p>
            </div>
          </div>
        `;
        
        await sendAdminNotification(resendApiKey, '💰 VENDA APROVADA - ProspectAI (Vitalício)', emailHtml);
      }

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
