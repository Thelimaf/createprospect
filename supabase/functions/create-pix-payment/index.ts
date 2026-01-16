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