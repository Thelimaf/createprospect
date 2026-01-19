import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Step 1: Try to find CNPJ via Firecrawl search
    if (firecrawlApiKey) {
      const searchQuery = `"${business_name}" CNPJ ${city || ""} site:consultacnpj.com OR site:casadosdados.com.br OR site:cnpj.info`;
      
      console.log('Searching for CNPJ via Firecrawl:', searchQuery);

      try {
        const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/search', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: searchQuery,
            limit: 5,
            lang: 'pt',
            country: 'BR',
          }),
        });

        if (firecrawlResponse.ok) {
          const searchData = await firecrawlResponse.json();
          console.log('Firecrawl search results:', JSON.stringify(searchData).substring(0, 500));

          // Try to extract CNPJ from search results
          if (searchData.data && Array.isArray(searchData.data)) {
            for (const result of searchData.data) {
              const textToSearch = `${result.title || ''} ${result.description || ''} ${result.url || ''}`;
              const foundCnpj = extractCnpjFromText(textToSearch);
              if (foundCnpj) {
                cnpj = foundCnpj;
                console.log('Found CNPJ in search results:', cnpj);
                break;
              }
            }
          }
        } else {
          console.error('Firecrawl search failed:', await firecrawlResponse.text());
        }
      } catch (firecrawlError) {
        console.error('Firecrawl error:', firecrawlError);
      }
    } else {
      console.log('Firecrawl API key not available, skipping search');
    }

    // If we couldn't find CNPJ, return early
    if (!cnpj) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'CNPJ não encontrado. Tente buscar manualmente.',
          searched: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Query Brasil API with the found CNPJ
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

    // Step 3: Update lead with enriched data
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
