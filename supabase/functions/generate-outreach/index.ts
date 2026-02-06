import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificar se o usuário está autenticado
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { campaign, prospect, messageType } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não está configurada');
    }

    console.log('Gerando alcance para:', { 
      campaignGoal: campaign.goal, 
      prospectName: prospect.name,
      messageType 
    });

    const toneInstructions: Record<string, string> = {
      professional: 'Mantenha um tom profissional e apropriado para negócios. Seja conciso e direto.',
      casual: 'Use um tom amigável e conversacional. Sinta-se à vontade para ser mais descontraído.',
      friendly: 'Seja caloroso e pessoal. Mostre interesse genuíno e entusiasmo.'
    };

    const lengthInstructions = messageType === 'email' 
      ? 'Escreva 3-4 parágrafos curtos. Inclua uma linha de assunto no início.'
      : 'Mantenha abaixo de 300 caracteres para convite de conexão do LinkedIn, ou abaixo de 1000 caracteres para uma mensagem do LinkedIn.';

    const systemPrompt = `Você é um especialista em escrever mensagens de alcance personalizadas que obtêm respostas.
Suas mensagens são:
- Altamente personalizadas com base no histórico do destinatário
- Claras sobre a proposta de valor
- Concisas e fáceis de ler
- Têm um call-to-action claro

IMPORTANTE: Escreva SEMPRE em português brasileiro.

${toneInstructions[campaign.tone] || toneInstructions.professional}
${lengthInstructions}`;

    const userPrompt = `Escreva ${messageType === 'email' ? 'um email frio' : 'uma mensagem do LinkedIn'} para o seguinte:

OBJETIVO DA CAMPANHA: ${campaign.goal}

${campaign.context ? `SOBRE MIM/MINHA EMPRESA: ${campaign.context}` : ''}

INFORMAÇÕES DO DESTINATÁRIO:
- Nome: ${prospect.name}
${prospect.position ? `- Cargo: ${prospect.position}` : ''}
${prospect.company ? `- Empresa: ${prospect.company}` : ''}
${prospect.location ? `- Localização: ${prospect.location}` : ''}
${prospect.description ? `- Background: ${prospect.description}` : ''}

Escreva ${messageType === 'email' ? 'um email personalizado (com linha de assunto)' : 'uma mensagem do LinkedIn personalizada'} que:
1. Faça referência a algo específico do background deles
2. Explique claramente por que estou entrando em contato
3. Tenha um call-to-action simples e claro

${messageType === 'email' ? 'Formato: Comece com "Assunto: [linha de assunto]" na primeira linha, depois o corpo do email.' : ''}

IMPORTANTE: A mensagem DEVE ser escrita em português brasileiro.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Limite de taxa excedido. Tente novamente mais tarde.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos de IA esgotados. Adicione créditos para continuar.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('Erro do gateway de IA:', response.status, errorText);
      throw new Error('Falha ao gerar mensagem');
    }

    const data = await response.json();
    const generatedMessage = data.choices?.[0]?.message?.content;

    if (!generatedMessage) {
      throw new Error('Nenhuma mensagem gerada');
    }

    console.log('Mensagem gerada com sucesso');

    return new Response(JSON.stringify({ message: generatedMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro em generate-outreach:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
