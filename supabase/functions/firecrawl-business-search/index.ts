const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper: Extract Brazilian phone number
function extractPhone(text: string | null | undefined): string | null {
  if (!text) return null;
  // Match Brazilian phone patterns: (XX) XXXXX-XXXX, XX XXXXX-XXXX, +55 XX XXXXX-XXXX
  const patterns = [
    /(?:\+55\s?)?(?:\(?\d{2}\)?[\s.-]?)?\d{4,5}[\s.-]?\d{4}/g,
  ];
  
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      // Clean and return first valid phone
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
  // Match CNPJ patterns: XX.XXX.XXX/XXXX-XX or just numbers
  const match = text.match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/);
  if (match) {
    return match[0].replace(/\D/g, '');
  }
  return null;
}

// Fetch CNPJ data from Brasil API
async function fetchBrasilApi(cnpj: string): Promise<any | null> {
  try {
    const cleanCnpj = cnpj.replace(/\D/g, '');
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Brasil API error:', error);
    return null;
  }
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

    let savedCount = 0;
    const savedLeads: any[] = [];

    for (const result of results) {
      try {
        const content = result.markdown || result.description || '';
        const title = result.title || '';
        const url = result.url || '';

        // Extract contact information
        const phone = extractPhone(content) || extractPhone(title);
        const email = extractEmail(content);
        const cnpj = extractCnpj(content);

        // Try to enrich with Brasil API if CNPJ found
        let cnpjData: any = null;
        if (cnpj) {
          cnpjData = await fetchBrasilApi(cnpj);
        }

        // Build lead data
        const leadData = {
          user_id,
          campaign_id: campaignId && campaignId !== 'none' ? campaignId : null,
          business_name: cnpjData?.nome_fantasia || cnpjData?.razao_social || title || url,
          website: url,
          phone,
          email,
          cnpj: cnpjData?.cnpj || cnpj,
          razao_social: cnpjData?.razao_social,
          nome_fantasia: cnpjData?.nome_fantasia,
          cnpj_status: cnpjData?.situacao_cadastral,
          socios: cnpjData?.qsa ? cnpjData.qsa : null,
          cnae_principal: cnpjData?.cnae_fiscal_descricao,
          capital_social: cnpjData?.capital_social,
          data_abertura: cnpjData?.data_inicio_atividade,
          city: cnpjData?.municipio,
          state: cnpjData?.uf,
          address: cnpjData ? `${cnpjData.logradouro || ''} ${cnpjData.numero || ''}, ${cnpjData.bairro || ''}`.trim() : null,
          zip_code: cnpjData?.cep,
          source: 'firecrawl_web',
          status: 'new',
          scrape_data: {
            original_title: title,
            original_url: url,
            markdown_preview: content?.substring(0, 500),
          },
        };

        // Check for duplicates by website or business_name
        const { data: existing } = await supabase
          .from('google_maps_leads')
          .select('id')
          .eq('user_id', user_id)
          .or(`website.eq.${url},business_name.eq.${leadData.business_name}`)
          .limit(1);

        if (!existing || existing.length === 0) {
          const { error: insertError } = await supabase
            .from('google_maps_leads')
            .insert(leadData);

          if (insertError) {
            console.error('Error inserting lead:', insertError);
          } else {
            savedCount++;
            savedLeads.push(leadData);
          }
        } else {
          console.log('Duplicate lead skipped:', leadData.business_name);
        }
      } catch (leadError) {
        console.error('Error processing lead:', leadError);
      }
    }

    console.log(`Saved ${savedCount} leads from Firecrawl search`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        leads_saved: savedCount,
        total_found: results.length,
        leads: savedLeads,
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
