import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the user is authenticated
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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { campaign, prospect, messageType } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Generating outreach for:', { 
      campaignGoal: campaign.goal, 
      prospectName: prospect.name,
      messageType 
    });

    const toneInstructions: Record<string, string> = {
      professional: 'Keep a professional, business-appropriate tone. Be concise and direct.',
      casual: 'Use a friendly, conversational tone. Feel free to be more relaxed.',
      friendly: 'Be warm and personable. Show genuine interest and enthusiasm.'
    };

    const lengthInstructions = messageType === 'email' 
      ? 'Write 3-4 short paragraphs. Include a subject line at the start.'
      : 'Keep it under 300 characters for LinkedIn connection request, or under 1000 characters for a LinkedIn message.';

    const systemPrompt = `You are an expert at writing personalized outreach messages that get responses.
Your messages are:
- Highly personalized based on the recipient's background
- Clear about the value proposition
- Concise and easy to read
- Have a clear call-to-action

${toneInstructions[campaign.tone] || toneInstructions.professional}
${lengthInstructions}`;

    const userPrompt = `Write a ${messageType === 'email' ? 'cold email' : 'LinkedIn message'} for the following:

CAMPAIGN GOAL: ${campaign.goal}

${campaign.context ? `ABOUT ME/MY COMPANY: ${campaign.context}` : ''}

RECIPIENT INFORMATION:
- Name: ${prospect.name}
${prospect.position ? `- Position: ${prospect.position}` : ''}
${prospect.company ? `- Company: ${prospect.company}` : ''}
${prospect.location ? `- Location: ${prospect.location}` : ''}
${prospect.description ? `- Background: ${prospect.description}` : ''}

Write a personalized ${messageType === 'email' ? 'email (with subject line)' : 'LinkedIn message'} that:
1. References something specific from their background
2. Clearly explains why I'm reaching out
3. Has a simple, clear call-to-action

${messageType === 'email' ? 'Format: Start with "Subject: [subject line]" on the first line, then the email body.' : ''}`;

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
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('Failed to generate message');
    }

    const data = await response.json();
    const generatedMessage = data.choices?.[0]?.message?.content;

    if (!generatedMessage) {
      throw new Error('No message generated');
    }

    console.log('Message generated successfully');

    return new Response(JSON.stringify({ message: generatedMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-outreach:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
