import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

serve(async (req) => {
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

    console.log('Creating PIX payment for user:', user.id);

    // Get request body
    const { customer_name, customer_email, customer_phone, customer_cpf } = await req.json();

    if (!customer_name || !customer_email || !customer_phone || !customer_cpf) {
      return new Response(
        JSON.stringify({ error: 'Dados do cliente são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already has active subscription
    const { data: existingSub } = await supabase
      .from('user_subscriptions')
      .select('*, subscription_plans!inner(slug)')
      .eq('user_id', user.id)
      .single();

    if (existingSub && existingSub.subscription_plans?.slug === 'starter' && existingSub.status === 'active') {
      return new Response(
        JSON.stringify({ error: 'Você já possui uma assinatura ativa' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for pending payments
    const { data: pendingPayment } = await supabase
      .from('pix_payments')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'PENDING')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (pendingPayment) {
      console.log('Returning existing pending payment:', pendingPayment.abacate_charge_id);
      return new Response(
        JSON.stringify({
          success: true,
          charge_id: pendingPayment.abacate_charge_id,
          br_code: pendingPayment.br_code,
          br_code_base64: pendingPayment.br_code_base64,
          expires_at: pendingPayment.expires_at,
          amount: pendingPayment.amount_brl,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format phone for Abacate Pay: (11) 4002-8922
    const phoneDigits = customer_phone.replace(/\D/g, '');
    const formattedPhone = phoneDigits.length === 11
      ? `(${phoneDigits.slice(0, 2)}) ${phoneDigits.slice(2, 7)}-${phoneDigits.slice(7)}`
      : `(${phoneDigits.slice(0, 2)}) ${phoneDigits.slice(2, 6)}-${phoneDigits.slice(6)}`;

    // Format CPF for Abacate Pay: 123.456.789-01
    const cpfDigits = customer_cpf.replace(/\D/g, '');
    const formattedCpf = `${cpfDigits.slice(0, 3)}.${cpfDigits.slice(3, 6)}.${cpfDigits.slice(6, 9)}-${cpfDigits.slice(9)}`;

    console.log('Calling Abacate Pay API with:', {
      amount: 2790,
      customer_name,
      customer_email,
      formattedPhone,
      formattedCpf,
    });

    // Create PIX charge with Abacate Pay - using pixQrCode/create endpoint
    const abacateResponse = await fetch('https://api.abacatepay.com/v1/pixQrCode/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${abacateApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: 2790, // R$ 27,90 em centavos
        expiresIn: 1800, // 30 minutos em segundos
        description: 'ProspectAI - Plano Starter Mensal',
        customer: {
          name: customer_name,
          cellphone: formattedPhone,
          email: customer_email,
          taxId: formattedCpf,
        },
        metadata: {
          externalId: user.id,
        },
      }),
    });

    // Handle non-JSON responses gracefully
    const responseText = await abacateResponse.text();
    console.log('Abacate Pay raw response:', responseText);
    
    let abacateData;
    try {
      abacateData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse Abacate response:', responseText);
      return new Response(
        JSON.stringify({ error: 'Erro na resposta do gateway de pagamento' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Abacate Pay parsed response:', JSON.stringify(abacateData));

    if (!abacateResponse.ok || (abacateData.error && abacateData.error !== '<unknown>')) {
      console.error('Abacate Pay error:', abacateData);
      return new Response(
        JSON.stringify({ error: abacateData.error || 'Erro ao criar cobrança PIX. Tente novamente.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pixData = abacateData.data;
    console.log('PIX data:', JSON.stringify(pixData));

    if (!pixData || !pixData.id || !pixData.brCode) {
      console.error('Invalid PIX data from Abacate Pay:', pixData);
      return new Response(
        JSON.stringify({ error: 'Resposta inválida do gateway de pagamento' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save payment record
    const { error: insertError } = await supabase
      .from('pix_payments')
      .insert({
        user_id: user.id,
        abacate_charge_id: pixData.id,
        amount_brl: 27.90,
        status: 'PENDING',
        br_code: pixData.brCode,
        br_code_base64: pixData.brCodeBase64,
        expires_at: pixData.expiresAt,
        customer_name,
        customer_email,
        customer_phone,
        customer_cpf,
      });

    if (insertError) {
      console.error('Error saving payment:', insertError);
      return new Response(
        JSON.stringify({ error: 'Erro ao salvar pagamento' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('PIX payment created successfully:', pixData.id);

    // Send admin notification about new PIX generated
    if (resendApiKey) {
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #8b5cf6, #6366f1); padding: 20px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🔔 Novo PIX Gerado</h1>
          </div>
          <div style="background: #1a1a2e; padding: 24px; border-radius: 0 0 12px 12px; color: #e0e0e0;">
            <h2 style="color: #f59e0b; margin-top: 0;">Dados do Cliente</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #9ca3af;">Nome:</td>
                <td style="padding: 8px 0; color: #fff; font-weight: bold;">${customer_name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #9ca3af;">Email:</td>
                <td style="padding: 8px 0; color: #fff;">${customer_email}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #9ca3af;">Telefone:</td>
                <td style="padding: 8px 0; color: #fff;">${customer_phone}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #9ca3af;">CPF:</td>
                <td style="padding: 8px 0; color: #fff;">${formattedCpf}</td>
              </tr>
            </table>
            <hr style="border: none; border-top: 1px solid #374151; margin: 16px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #9ca3af;">Valor:</td>
                <td style="padding: 8px 0; color: #22c55e; font-weight: bold; font-size: 18px;">R$ 27,90</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #9ca3af;">ID do PIX:</td>
                <td style="padding: 8px 0; color: #fff; font-family: monospace; font-size: 12px;">${pixData.id}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #9ca3af;">Status:</td>
                <td style="padding: 8px 0;"><span style="background: #f59e0b; color: #000; padding: 4px 12px; border-radius: 4px; font-weight: bold;">AGUARDANDO</span></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #9ca3af;">User ID:</td>
                <td style="padding: 8px 0; color: #fff; font-family: monospace; font-size: 12px;">${user.id}</td>
              </tr>
            </table>
            <p style="color: #6b7280; font-size: 12px; margin-top: 24px; text-align: center;">
              ProspectAI - Sistema de Prospecção Inteligente
            </p>
          </div>
        </div>
      `;
      
      await sendAdminNotification(resendApiKey, '🔔 Novo PIX Gerado - ProspectAI', emailHtml);
    }

    return new Response(
      JSON.stringify({
        success: true,
        charge_id: pixData.id,
        br_code: pixData.brCode,
        br_code_base64: pixData.brCodeBase64,
        expires_at: pixData.expiresAt,
        amount: 27.90,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-pix-payment:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
