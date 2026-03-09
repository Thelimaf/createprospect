const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Helper: Extract Brazilian phone number
function extractPhone(text: string | null | undefined): string | null {
  if (!text) return null;
  const patterns = [
    /(?:\+55\s?)?(?:\(?\d{2}\)?[\s.-]?)?\d{4,5}[\s.-]?\d{4}/g,
  ];
  
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      const phone = matches[0].replace(/\D/g, '');
      if (phone.length >= 10 && phone.length <= 13) {
        return phone;
      }
    }
  }
  return null;
}

// Helper: Extract email
function extractEmail(text: string | null | undefined): string | null {
  if (!text) return null;
  const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0].toLowerCase() : null;
}

// Helper: Extract CNPJ
function extractCnpj(text: string | null | undefined): string | null {
  if (!text) return null;
  const match = text.match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/);
  if (match) {
    return match[0].replace(/\D/g, '');
  }
  return null;
}

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, limit = 10, campaignId, user_id } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ success: false, error: 'Query é obrigatória' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!user_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'user_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlApiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl não está configurado. Conecte o Firecrawl nas configurações.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Searching via Firecrawl:', query, 'limit:', limit);

    // 1. Search via Firecrawl with scrape options to get markdown content
    const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `${query} empresa contato telefone email`,
        limit: Math.min(limit, 20), // Firecrawl has limits
        lang: 'pt-BR',
        country: 'BR',
        scrapeOptions: {
          formats: ['markdown'],
        },
      }),
    });

    const searchData = await searchResponse.json();

    if (!searchResponse.ok) {
      console.error('Firecrawl search error:', searchData);
      return new Response(
        JSON.stringify({ success: false, error: searchData.error || 'Erro ao buscar no Firecrawl' }),
        { status: searchResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = searchData.data || [];
    console.log(`Found ${results.length} results from Firecrawl`);

    // 1. Fetch all existing websites for this user (batch duplicate check)
    const { data: existingLeads } = await supabase
      .from('google_maps_leads')
      .select('website, business_name')
      .eq('user_id', user_id);

    const existingWebsites = new Set(existingLeads?.map(l => l.website?.toLowerCase()).filter(Boolean));
    const existingNames = new Set(existingLeads?.map(l => l.business_name?.toLowerCase()).filter(Boolean));

    // 2. Process all leads in parallel (no Brasil API - that's on-demand later)
    const processedLeads = results.map((result: any) => {
      const content = result.markdown || result.description || '';
      const title = result.title || '';
      const url = result.url || '';

      // Extract contact information
      const phone = extractPhone(content) || extractPhone(title);
      const email = extractEmail(content);
      const cnpj = extractCnpj(content);

      // Build lead data (without Brasil API enrichment - that's on-demand)
      return {
        user_id,
        campaign_id: campaignId && campaignId !== 'none' ? campaignId : null,
        business_name: title || url,
        website: url,
        phone,
        email,
        cnpj, // Just extracted, not enriched
        source: 'firecrawl_web',
        status: 'new',
        scrape_data: {
          original_title: title,
          original_url: url,
          markdown_preview: content?.substring(0, 500),
        },
      };
    });

    // 3. Filter out duplicates
    const newLeads = processedLeads.filter((lead: any) => {
      const websiteLower = lead.website?.toLowerCase();
      const nameLower = lead.business_name?.toLowerCase();
      
      if (websiteLower && existingWebsites.has(websiteLower)) {
        console.log('Duplicate skipped (website):', lead.website);
        return false;
      }
      if (nameLower && existingNames.has(nameLower)) {
        console.log('Duplicate skipped (name):', lead.business_name);
        return false;
      }
      return true;
    });

    console.log(`${newLeads.length} new leads after deduplication`);

    // 4. Batch upsert all new leads at once (using composite key user_id + website)
    let savedCount = 0;
    if (newLeads.length > 0) {
      // Add place_id based on website hash for upsert to work correctly
      const leadsWithPlaceId = newLeads.map((lead: any) => ({
        ...lead,
        place_id: lead.website ? `firecrawl_${btoa(lead.website).slice(0, 50)}` : null,
      }));

      const { error: upsertError } = await supabase
        .from('google_maps_leads')
        .upsert(leadsWithPlaceId, {
          onConflict: 'user_id,place_id',
          ignoreDuplicates: false
        });

      if (upsertError) {
        console.error('Batch upsert error:', upsertError);
      } else {
        savedCount = newLeads.length;
      }
    }

    // Calculate statistics for better feedback
    const duplicatesCount = results.length - newLeads.length;
    const withCnpj = newLeads.filter((l: any) => l.cnpj).length;
    const withEmail = newLeads.filter((l: any) => l.email).length;
    const withPhone = newLeads.filter((l: any) => l.phone).length;

    console.log(`Saved ${savedCount} leads from Firecrawl search`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        leads_saved: savedCount,
        total_found: results.length,
        stats: {
          new: savedCount,
          duplicates: duplicatesCount,
          with_cnpj: withCnpj,
          with_email: withEmail,
          with_phone: withPhone,
        },
        leads: newLeads,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Firecrawl business search error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
