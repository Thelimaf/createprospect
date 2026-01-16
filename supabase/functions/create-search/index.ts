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

    const { query, entityType, criteria, enrichments, count, campaignId } = await req.json();

    console.log('Creating search with:', { query, entityType, criteria, enrichments, count, campaignId });

    const exaApiKey = Deno.env.get('EXA_API_KEY');
    if (!exaApiKey) {
      throw new Error('EXA_API_KEY not configured');
    }

    // Build the search query with entity type context
    const searchQuery = entityType === 'person' 
      ? `${query} (person profile OR LinkedIn OR executive OR founder)`
      : `${query} (company OR business OR startup OR organization)`;

    // Use the standard Exa /search API (works on free plan)
    const searchResponse = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': exaApiKey,
      },
      body: JSON.stringify({
        query: searchQuery,
        numResults: count || 10,
        type: 'neural',
        useAutoprompt: true,
        contents: {
          text: true,
          highlights: true,
        },
      }),
    });

    if (!searchResponse.ok) {
      const error = await searchResponse.text();
      console.error('Search failed:', error);
      throw new Error(`Failed to search: ${error}`);
    }

    const searchData = await searchResponse.json();
    console.log('Search completed, results:', searchData.results?.length || 0);

    // Store search in database
    const { data: searchRecord, error: dbError } = await supabaseClient
      .from('searches')
      .insert({
        user_id: user.id,
        query,
        entity_type: entityType,
        criteria: JSON.stringify(criteria),
        enrichments: JSON.stringify(enrichments),
        webset_id: searchData.requestId || null,
        status: 'completed',
        campaign_id: campaignId || null,
        result_count: searchData.results?.length || 0,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    }

    // Store results immediately (search API is synchronous)
    if (searchData.results && searchData.results.length > 0) {
      const serviceClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const results = searchData.results.map((result: {
        id: string;
        title?: string;
        url?: string;
        text?: string;
        highlights?: string[];
        score?: number;
        publishedDate?: string;
        author?: string;
      }) => {
        // Extract name from title or URL
        let name = result.title || 'Sem nome';
        
        // Try to extract company/person name from title
        if (result.title) {
          // Remove common suffixes like "| LinkedIn", "- Company Info", etc.
          name = result.title
            .replace(/\s*[\|–\-]\s*(LinkedIn|Facebook|Twitter|Company|Profile|About).*$/i, '')
            .trim();
        }

        return {
          search_id: searchRecord.id,
          item_id: result.id,
          name: name,
          url: result.url || '',
          enrichment_data: {
            title: result.title,
            text: result.text,
            highlights: result.highlights,
            score: result.score,
            publishedDate: result.publishedDate,
            author: result.author,
            entityType: entityType,
          },
        };
      });

      console.log('Storing results:', results.length);

      const { error: insertError } = await serviceClient
        .from('search_results')
        .upsert(results, { onConflict: 'item_id' });

      if (insertError) {
        console.error('Error storing results:', insertError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        search: searchRecord,
        resultCount: searchData.results?.length || 0,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in create-search:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
