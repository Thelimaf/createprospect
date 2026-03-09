import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Regex para extrair CNPJ de texto
const CNPJ_REGEX = /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g;

function cleanCnpj(cnpj: string): string {
  return cnpj.replace(/[^\d]/g, '');
}

function extractCnpjFromText(text: string): string | null {
  const matches = text.match(CNPJ_REGEX);
  if (matches && matches.length > 0) {
    return cleanCnpj(matches[0]);
  }
  return null;
}

// Validate CNPJ checksum
function isValidCnpj(cnpj: string): boolean {
  const clean = cnpj.replace(/[^\d]/g, '');
  if (clean.length !== 14) return false;
  
  // Check for repeated digits
  if (/^(\d)\1+$/.test(clean)) return false;
  
  // Calculate first check digit
  let sum = 0;
  let weight = 5;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(clean[i]) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  let digit = 11 - (sum % 11);
  if (digit > 9) digit = 0;
  if (digit !== parseInt(clean[12])) return false;
  
  // Calculate second check digit
  sum = 0;
  weight = 6;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(clean[i]) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  digit = 11 - (sum % 11);
  if (digit > 9) digit = 0;
  if (digit !== parseInt(clean[13])) return false;
  
  return true;
}

async function searchCnpjWithFirecrawl(
  apiKey: string, 
  businessName: string, 
  city?: string
): Promise<string | null> {
  // Try multiple search strategies
  const searchQueries = [
    // Strategy 1: Direct business name + CNPJ
    `"${businessName}" CNPJ`,
    // Strategy 2: With city if available
    city ? `"${businessName}" "${city}" CNPJ` : null,
    // Strategy 3: Broader search without quotes
    `${businessName} CNPJ empresa`,
    // Strategy 4: Search on specific CNPJ sites
    `site:casadosdados.com.br "${businessName}"`,
  ].filter(Boolean) as string[];

  for (const query of searchQueries) {
    console.log('Trying CNPJ search query:', query);
    
    try {
      const response = await fetch('https://api.firecrawl.dev/v1/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          limit: 10,
          lang: 'pt',
          country: 'BR',
        }),
      });

      if (!response.ok) {
        console.error('Firecrawl search failed for query:', query);
        continue;
      }

      const searchData = await response.json();
      
      if (searchData.data && Array.isArray(searchData.data)) {
        for (const result of searchData.data) {
          // Search in all available text
          const textToSearch = [
            result.title || '',
            result.description || '',
            result.url || '',
            result.markdown || '',
            result.content || '',
          ].join(' ');
          
          const foundCnpj = extractCnpjFromText(textToSearch);
          if (foundCnpj && isValidCnpj(foundCnpj)) {
            console.log('Found valid CNPJ:', foundCnpj, 'from query:', query);
            return foundCnpj;
          }
        }
      }
    } catch (error) {
      console.error('Firecrawl error for query:', query, error);
    }
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');

    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });
    
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { lead_id, business_name, city } = await req.json();

    if (!lead_id || !business_name) {
      return new Response(
        JSON.stringify({ success: false, error: 'lead_id and business_name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Enriching lead ${lead_id}: "${business_name}" in ${city || 'unknown city'}`);

    let cnpj: string | null = null;

    // Step 1: Check if lead already has website content with CNPJ
    const { data: leadData } = await supabaseClient
      .from('google_maps_leads')
      .select('scrape_data, website')
      .eq('id', lead_id)
      .eq('user_id', user.id)
      .single();

    if (leadData?.scrape_data) {
      const scrapeContent = typeof leadData.scrape_data === 'string' 
        ? leadData.scrape_data 
        : JSON.stringify(leadData.scrape_data);
      
      const cnpjFromScrape = extractCnpjFromText(scrapeContent);
      if (cnpjFromScrape && isValidCnpj(cnpjFromScrape)) {
        cnpj = cnpjFromScrape;
        console.log('Found CNPJ in existing scrape data:', cnpj);
      }
    }

    // Step 2: Try Firecrawl search if no CNPJ found yet
    if (!cnpj && firecrawlApiKey) {
      cnpj = await searchCnpjWithFirecrawl(firecrawlApiKey, business_name, city);
    }

    // If we couldn't find CNPJ, return early
    if (!cnpj) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'CNPJ não encontrado. Tente analisar o website primeiro ou buscar manualmente.',
          searched: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Query Brasil API with the found CNPJ
    console.log('Querying Brasil API for CNPJ:', cnpj);

    const brasilApiResponse = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
    
    if (!brasilApiResponse.ok) {
      const errorText = await brasilApiResponse.text();
      console.error('Brasil API error:', errorText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao consultar dados do CNPJ na Brasil API',
          cnpj
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cnpjData = await brasilApiResponse.json();
    console.log('Brasil API data received:', JSON.stringify(cnpjData).substring(0, 500));

    // Step 4: Update lead with enriched data
    const updateData = {
      cnpj,
      razao_social: cnpjData.razao_social || null,
      nome_fantasia: cnpjData.nome_fantasia || null,
      cnpj_status: cnpjData.descricao_situacao_cadastral || null,
      cnae_principal: cnpjData.cnae_fiscal_descricao 
        ? `${cnpjData.cnae_fiscal} - ${cnpjData.cnae_fiscal_descricao}` 
        : null,
      socios: cnpjData.qsa || null,
      capital_social: cnpjData.capital_social || null,
      data_abertura: cnpjData.data_inicio_atividade || null,
      enriched_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabaseClient
      .from('google_maps_leads')
      .update(updateData)
      .eq('id', lead_id)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating lead:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao salvar dados do CNPJ' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Lead enriched successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: {
          cnpj,
          razao_social: cnpjData.razao_social,
          nome_fantasia: cnpjData.nome_fantasia,
          situacao: cnpjData.descricao_situacao_cadastral,
          cnae: updateData.cnae_principal,
          socios: cnpjData.qsa,
          capital_social: cnpjData.capital_social,
          data_abertura: cnpjData.data_inicio_atividade,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error enriching lead:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
