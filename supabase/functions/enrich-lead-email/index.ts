import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface HunterEmail {
  value: string;
  type: string;
  confidence: number;
  first_name: string | null;
  last_name: string | null;
  position: string | null;
}

interface HunterResponse {
  data: {
    domain: string;
    emails: HunterEmail[];
    organization: string;
  };
  meta: {
    results: number;
    limit: number;
    offset: number;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const HUNTER_API_KEY = Deno.env.get('HUNTER_API_KEY');
    if (!HUNTER_API_KEY) {
      console.error('HUNTER_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Hunter.io API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { lead_id, website } = await req.json();
    console.log(`Enriching lead ${lead_id} with website: ${website}`);

    if (!lead_id || !website) {
      return new Response(
        JSON.stringify({ error: 'lead_id and website are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract domain from website
    let domain: string;
    try {
      const url = new URL(website.startsWith('http') ? website : `https://${website}`);
      domain = url.hostname.replace('www.', '');
    } catch {
      console.error('Invalid website URL:', website);
      return new Response(
        JSON.stringify({ error: 'Invalid website URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Searching Hunter.io for domain: ${domain}`);

    // Call Hunter.io Domain Search API
    const hunterUrl = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${HUNTER_API_KEY}`;
    const hunterResponse = await fetch(hunterUrl);
    
    if (!hunterResponse.ok) {
      const errorText = await hunterResponse.text();
      console.error('Hunter.io API error:', hunterResponse.status, errorText);
      
      if (hunterResponse.status === 401) {
        return new Response(
          JSON.stringify({ error: 'Invalid Hunter.io API key' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (hunterResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Hunter.io rate limit exceeded' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Hunter.io API error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const hunterData: HunterResponse = await hunterResponse.json();
    console.log(`Hunter.io returned ${hunterData.data.emails?.length || 0} emails for ${domain}`);

    // Get the email with highest confidence
    let bestEmail: HunterEmail | null = null;
    if (hunterData.data.emails && hunterData.data.emails.length > 0) {
      bestEmail = hunterData.data.emails.sort((a, b) => b.confidence - a.confidence)[0];
      console.log(`Best email found: ${bestEmail.value} (confidence: ${bestEmail.confidence}%)`);
    }

    // Update the lead with the email
    const updateData: Record<string, unknown> = {
      enriched_at: new Date().toISOString(),
    };

    if (bestEmail) {
      updateData.email = bestEmail.value;
    }

    const { error: updateError } = await supabase
      .from('google_maps_leads')
      .update(updateData)
      .eq('id', lead_id)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating lead:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update lead' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Lead ${lead_id} enriched successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        email: bestEmail?.value || null,
        confidence: bestEmail?.confidence || null,
        organization: hunterData.data.organization,
        emails_found: hunterData.data.emails?.length || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
