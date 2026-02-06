import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ADMIN_EMAIL = 'anderson.ferlimajunior@gmail.com';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const abacateApiKey = Deno.env.get('ABACATE_PAY_API_KEY');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!abacateApiKey) {
      return new Response(
        JSON.stringify({ error: 'ABACATE_PAY_API_KEY not configured' }),
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

    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match?.[1]) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = match[1].trim();

    // Validate JWT via claims
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      console.error('Claims error:', claimsError);
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userEmail = (claimsData.claims as any).email as string | undefined;

    // Only admin can simulate payments
    if (userEmail !== ADMIN_EMAIL) {
      console.log('Access denied for:', userEmail);
      return new Response(
        JSON.stringify({ error: 'Acesso negado' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client for privileged operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { charge_id } = await req.json();

    if (!charge_id) {
      return new Response(
        JSON.stringify({ error: 'charge_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Simulating payment for:', charge_id);

    // Get payment info
    const { data: payment, error: paymentError } = await supabase
      .from('pix_payments')
      .select('*')
      .eq('abacate_charge_id', charge_id)
      .single();

    if (paymentError || !payment) {
      return new Response(
        JSON.stringify({ error: 'Pagamento não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Abacate Pay simulate endpoint
    const simulateResponse = await fetch('https://api.abacatepay.com/v1/pixQrCode/simulate-payment', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${abacateApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        identifier: charge_id
      }),
    });

    const simulateData = await simulateResponse.json();
    console.log('Simulate response:', JSON.stringify(simulateData));

    if (!simulateResponse.ok && simulateData.error && simulateData.error !== '<unknown>') {
      return new Response(
        JSON.stringify({ error: simulateData.error || 'Erro ao simular pagamento' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update payment status to PAID
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + 30);

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
        .upsert({
          user_id: payment.user_id,
          plan_id: starterPlan.id,
          status: 'active',
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
        }, { onConflict: 'user_id' });

      // Reset monthly usage
      await supabase
        .from('user_usage')
        .update({
          searches_used_monthly: 0,
          reset_date: periodEnd.toISOString(),
        })
        .eq('user_id', payment.user_id);
    }

    console.log('Payment simulated and user upgraded:', payment.user_id);

    // Send admin notification
    if (resendApiKey) {
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 20px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🧪 Pagamento Simulado (Teste)</h1>
          </div>
          <div style="background: #1a1a2e; padding: 24px; border-radius: 0 0 12px 12px; color: #e0e0e0;">
            <div style="background: #f59e0b20; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin-bottom: 20px; text-align: center;">
              <span style="color: #f59e0b; font-size: 32px; font-weight: bold;">SIMULAÇÃO</span>
              <p style="color: #f59e0b; margin: 8px 0 0 0;">Pagamento de teste aprovado</p>
            </div>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #9ca3af;">Cliente:</td>
                <td style="padding: 8px 0; color: #fff; font-weight: bold;">${payment.customer_name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #9ca3af;">Email:</td>
                <td style="padding: 8px 0; color: #fff;">${payment.customer_email}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #9ca3af;">Valor:</td>
                <td style="padding: 8px 0; color: #22c55e; font-weight: bold;">R$ ${payment.amount_brl.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #9ca3af;">ID:</td>
                <td style="padding: 8px 0; color: #fff; font-family: monospace;">${charge_id}</td>
              </tr>
            </table>
            <p style="color: #6b7280; font-size: 12px; margin-top: 24px; text-align: center;">
              Este é um pagamento de teste via simulador.
            </p>
          </div>
        </div>
      `;

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'ProspectAI <onboarding@resend.dev>',
          to: [ADMIN_EMAIL],
          subject: '🧪 Pagamento Simulado - ProspectAI',
          html: emailHtml,
        }),
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Pagamento simulado com sucesso',
        data: simulateData 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in simulate-pix-payment:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
