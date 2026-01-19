import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Regex patterns for extraction
const CNPJ_REGEX = /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(?:\+55\s?)?(?:\(?\d{2}\)?[\s.-]?)?\d{4,5}[\s.-]?\d{4}/g;

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

function extractEmailsFromText(text: string): string[] {
  const matches = text.match(EMAIL_REGEX) || [];
  // Filter out common non-email patterns and deduplicate
  const filtered = [...new Set(matches)]
    .filter(email => !email.includes('example.com'))
    .filter(email => !email.includes('sentry.io'))
    .filter(email => !email.includes('wix.com'))
    .slice(0, 5);
  return filtered;
}

function extractPhonesFromText(text: string): string[] {
  const matches = text.match(PHONE_REGEX) || [];
  // Deduplicate and limit
  return [...new Set(matches)].slice(0, 5);
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

async function enrichWithBrasilApi(cnpj: string): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Brasil API error:', error);
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
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

    const { url, lead_id, options } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('Scraping URL:', formattedUrl);

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: options?.formats || ['markdown', 'links'],
        onlyMainContent: options?.onlyMainContent ?? false, // Get full page to find footer CNPJ
        waitFor: options?.waitFor,
        location: options?.location || { country: 'BR', languages: ['pt'] },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firecrawl API error:', data);
      return new Response(
        JSON.stringify({ success: false, error: data.error || `Request failed with status ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Scrape successful');

    // Extract data from scraped content
    const scrapedContent = data.data?.markdown || '';
    const extractedCnpj = extractCnpjFromText(scrapedContent);
    const extractedEmails = extractEmailsFromText(scrapedContent);
    const extractedPhones = extractPhonesFromText(scrapedContent);
    
    let cnpjData: Record<string, unknown> | null = null;
    let validCnpj: string | null = null;

    // Validate and enrich CNPJ if found
    if (extractedCnpj && isValidCnpj(extractedCnpj)) {
      validCnpj = extractedCnpj;
      console.log('Found valid CNPJ in website:', validCnpj);
      cnpjData = await enrichWithBrasilApi(validCnpj);
    }

    // If lead_id is provided, save scrape data and extracted info to the lead
    if (lead_id) {
      const scrapeData = {
        content: scrapedContent,
        links: data.data?.links || [],
        title: data.data?.metadata?.title || null,
        description: data.data?.metadata?.description || null,
        extracted_emails: extractedEmails,
        extracted_phones: extractedPhones,
        extracted_cnpj: validCnpj,
        scraped_at: new Date().toISOString(),
      };

      // Build update object
      const updateFields: Record<string, unknown> = {
        scrape_data: scrapeData,
        updated_at: new Date().toISOString(),
      };

      // Add extracted email if lead doesn't have one
      if (extractedEmails.length > 0) {
        // We'll update email only if the lead doesn't have one
        const { data: currentLead } = await supabaseClient
          .from('google_maps_leads')
          .select('email')
          .eq('id', lead_id)
          .eq('user_id', user.id)
          .single();

        if (!currentLead?.email) {
          updateFields.email = extractedEmails[0];
        }
      }

      // Add CNPJ data if found
      if (validCnpj && cnpjData) {
        updateFields.cnpj = validCnpj;
        updateFields.razao_social = cnpjData.razao_social || null;
        updateFields.nome_fantasia = cnpjData.nome_fantasia || null;
        updateFields.cnpj_status = cnpjData.descricao_situacao_cadastral || null;
        updateFields.cnae_principal = cnpjData.cnae_fiscal_descricao 
          ? `${cnpjData.cnae_fiscal} - ${cnpjData.cnae_fiscal_descricao}` 
          : null;
        updateFields.socios = cnpjData.qsa || null;
        updateFields.capital_social = cnpjData.capital_social || null;
        updateFields.data_abertura = cnpjData.data_inicio_atividade || null;
        updateFields.enriched_at = new Date().toISOString();
      }

      const { error: updateError } = await supabaseClient
        .from('google_maps_leads')
        .update(updateFields)
        .eq('id', lead_id)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating lead with scrape data:', updateError);
      } else {
        console.log('Lead updated with scrape data and extracted info');
      }
    }

    // Return enriched response
    return new Response(
      JSON.stringify({
        ...data,
        extracted: {
          cnpj: validCnpj,
          cnpj_data: cnpjData,
          emails: extractedEmails,
          phones: extractedPhones,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error scraping:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to scrape';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
