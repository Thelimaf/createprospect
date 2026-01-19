import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Campaign {
  goal: string;
  context: string | null;
  tone: string;
}

interface Lead {
  business_name: string;
  category?: string | null;
  city?: string | null;
  rating?: number | null;
}

const toneInstructions: Record<string, string> = {
  professional: 'Use um tom profissional e formal, mas amigável.',
  casual: 'Use um tom casual e descontraído.',
  friendly: 'Use um tom muito amigável e acolhedor.',
};

// Message templates for different approaches
const messageTemplates: Record<string, { description: string; instruction: string }> = {
  apresentacao: {
    description: 'Primeira apresentação profissional',
    instruction: 'Crie uma mensagem de APRESENTAÇÃO PROFISSIONAL. Se apresente brevemente, mencione sua empresa e o que você pode oferecer. Seja cordial e profissional.',
  },
  followup: {
    description: 'Seguimento de conversa anterior',
    instruction: 'Crie uma mensagem de FOLLOW-UP. Mencione que está retomando o contato, reforce o interesse em ajudar e pergunte se há alguma novidade ou se podem conversar.',
  },
  proposta: {
    description: 'Proposta comercial direta',
    instruction: 'Crie uma mensagem com PROPOSTA DIRETA. Seja objetivo sobre o que você oferece, mencione benefícios concretos e inclua um call-to-action claro.',
  },
  casual: {
    description: 'Abordagem casual e amigável',
    instruction: 'Crie uma mensagem CASUAL e AMIGÁVEL. Use tom descontraído mas profissional, seja leve e crie uma conexão pessoal antes de falar de negócios.',
  },
};

// Message styles for additional variation
const messageStyles = [
  'Comece com uma observação positiva sobre o negócio ou nicho',
  'Comece se apresentando brevemente antes de falar do objetivo',
  'Comece mencionando que encontrou a empresa no Google Maps',
  'Comece com uma pergunta interessante sobre o negócio',
  'Comece elogiando a presença online ou avaliação do negócio',
  'Comece de forma direta mencionando uma oportunidade',
  'Comece com uma frase que gere curiosidade',
  'Comece fazendo uma conexão com a região/cidade do negócio',
];

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaign, lead, templateType }: { campaign: Campaign; lead?: Lead; templateType?: string } = await req.json();

    if (!campaign) {
      return new Response(
        JSON.stringify({ error: 'Campaign data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `Você é um especialista em criar mensagens de primeiro contato para WhatsApp.
Suas mensagens são:
- Curtas (máximo 500 caracteres)
- Diretas e pessoais
- Profissionais mas amigáveis
- Terminam com uma pergunta para engajar a conversa

IMPORTANTE: 
- Escreva SEMPRE em português brasileiro
- Use {nome} como placeholder para o nome do negócio (será substituído automaticamente)
- NÃO use emojis em excesso (máximo 1-2)
- NÃO seja muito formal ou muito informal
- Seja genuíno e mostre interesse real no negócio`;

    const leadInfo = lead ? `
INFORMAÇÕES DO LEAD:
- Nome do negócio: ${lead.business_name}
${lead.category ? `- Categoria: ${lead.category}` : ''}
${lead.city ? `- Cidade: ${lead.city}` : ''}
${lead.rating ? `- Avaliação: ${lead.rating} estrelas` : ''}` : '';

    // Select random style for variation
    const randomStyle = messageStyles[Math.floor(Math.random() * messageStyles.length)];
    
    // Get template instruction if provided
    const template = templateType ? messageTemplates[templateType] : null;
    const templateInstruction = template ? `\nTIPO DE ABORDAGEM: ${template.instruction}` : '';

    const userPrompt = `Crie uma mensagem de WhatsApp para primeiro contato.
${templateInstruction}
ESTILO DE ABERTURA: ${randomStyle}

OBJETIVO DA CAMPANHA: ${campaign.goal}
${campaign.context ? `SOBRE MIM/MINHA EMPRESA: ${campaign.context}` : ''}
TOM: ${toneInstructions[campaign.tone] || toneInstructions.professional}
${leadInfo}

REGRAS:
${template ? '- Siga o TIPO DE ABORDAGEM especificado' : '- Siga o ESTILO DE ABERTURA para começar a mensagem'}
- Use {nome} onde o nome do negócio deve aparecer
- Seja criativo e varie a estrutura da mensagem
- A mensagem deve ser persuasiva mas não agressiva
- Termine com uma pergunta ou call-to-action`;

    console.log("Generating WhatsApp message for campaign:", campaign.goal);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 300,
        temperature: 0.95,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error("Rate limit exceeded");
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        console.error("Payment required");
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos na sua conta Lovable." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar mensagem" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const generatedMessage = data.choices?.[0]?.message?.content?.trim();

    if (!generatedMessage) {
      console.error("No message generated from AI");
      return new Response(
        JSON.stringify({ error: "Não foi possível gerar a mensagem" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Generated message successfully:", generatedMessage.substring(0, 50) + "...");

    return new Response(
      JSON.stringify({ message: generatedMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in generate-whatsapp function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});