import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const EdgeRuntime: {
  waitUntil(promise: Promise<unknown>): void;
};

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

    console.log('Creating webset with:', { query, entityType, criteria, enrichments, count, campaignId });

    const exaApiKey = Deno.env.get('EXA_API_KEY');
    if (!exaApiKey) {
      throw new Error('EXA_API_KEY not configured');
    }

    // Build search criteria - ensure at least one criterion
    const searchCriteria = criteria && criteria.length > 0 
      ? criteria.map((c: { description?: string } | string) => ({ 
          description: typeof c === 'string' ? c : (c.description || c) 
        }))
      : [{ description: `Matches the search query: ${query}` }];

    // Build enrichments array
    const enrichmentConfigs = enrichments && enrichments.length > 0
      ? enrichments.map((e: { description: string; format?: string }) => ({
          description: e.description,
          format: e.format || 'text',
        }))
      : [];

    // Create webset with search and enrichments in a single request
    const requestBody: {
      search: {
        query: string;
        entity: { type: string };
        count: number;
        criteria: { description: string }[];
      };
      enrichments?: { description: string; format: string }[];
    } = {
      search: {
        query: query,
        entity: { type: entityType || 'company' },
        count: count || 10,
        criteria: searchCriteria,
      },
    };

    // Only add enrichments if we have any
    if (enrichmentConfigs.length > 0) {
      requestBody.enrichments = enrichmentConfigs;
    }

    console.log('API request body:', JSON.stringify(requestBody, null, 2));

    const websetResponse = await fetch('https://api.exa.ai/websets/v0/websets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': exaApiKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!websetResponse.ok) {
      const error = await websetResponse.text();
      console.error('Webset creation failed:', error);
      throw new Error(`Failed to create webset: ${error}`);
    }

    const websetData = await websetResponse.json();
    const websetId = websetData.id;

    console.log('Webset created:', websetId);
    console.log('Webset data:', JSON.stringify(websetData, null, 2));

    // Store search in database first
    const { data: searchRecord, error: dbError } = await supabaseClient
      .from('searches')
      .insert({
        user_id: user.id,
        query,
        entity_type: entityType,
        criteria: JSON.stringify(criteria),
        enrichments: JSON.stringify(enrichments),
        webset_id: websetId,
        status: 'processing',
        campaign_id: campaignId || null,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    }

    // Start background polling for results
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Use EdgeRuntime.waitUntil for background task
    const pollForResults = async () => {
      const maxAttempts = 30; // Poll for up to 5 minutes (30 * 10 seconds)
      let attempts = 0;

      while (attempts < maxAttempts) {
        attempts++;
        console.log(`Polling attempt ${attempts} for webset ${websetId}`);

        // Wait 10 seconds between polls
        await new Promise(resolve => setTimeout(resolve, 10000));

        try {
          // Check webset status
          const statusResponse = await fetch(
            `https://api.exa.ai/websets/v0/websets/${websetId}`,
            {
              headers: { 'x-api-key': exaApiKey! },
            }
          );

          if (!statusResponse.ok) {
            console.error('Status check failed:', await statusResponse.text());
            continue;
          }

          const websetStatus = await statusResponse.json();
          console.log(`Webset status: ${websetStatus.status}`);

          if (websetStatus.status === 'idle') {
            console.log('Webset is idle, fetching items...');

            // Fetch all items
            const itemsResponse = await fetch(
              `https://api.exa.ai/websets/v0/websets/${websetId}/items`,
              {
                headers: { 'x-api-key': exaApiKey! },
              }
            );

            if (!itemsResponse.ok) {
              console.error('Items fetch failed:', await itemsResponse.text());
              break;
            }

            const itemsData = await itemsResponse.json();
            console.log('Fetched items count:', itemsData.data?.length || 0);

            // Store results
            if (itemsData.data && itemsData.data.length > 0) {
              const results = itemsData.data.map((item: {
                id: string;
                properties?: {
                  person?: { name?: string };
                  company?: { name?: string };
                  url?: string;
                };
              }) => ({
                search_id: searchRecord.id,
                item_id: item.id,
                // Get name from correct nested path based on entity type
                name: item.properties?.person?.name || item.properties?.company?.name || 'Unknown',
                // Get URL from correct path
                url: item.properties?.url || '',
                // Store all properties for flexible access in frontend
                enrichment_data: item.properties || {},
              }));

              console.log('Storing results:', results.length);

              const { error: insertError } = await serviceClient
                .from('search_results')
                .upsert(results, { onConflict: 'item_id' });

              if (insertError) {
                console.error('Error storing results:', insertError);
              }

              // Update search status
              await serviceClient
                .from('searches')
                .update({
                  status: 'completed',
                  result_count: results.length,
                })
                .eq('id', searchRecord.id);

              console.log('Search completed with', results.length, 'results');
            } else {
              // No items found
              await serviceClient
                .from('searches')
                .update({
                  status: 'completed',
                  result_count: 0,
                })
                .eq('id', searchRecord.id);

              console.log('Search completed with 0 results');
            }

            break; // Exit polling loop
          }
        } catch (pollError) {
          console.error('Polling error:', pollError);
        }
      }

      if (attempts >= maxAttempts) {
        console.log('Max polling attempts reached, marking as timeout');
        await serviceClient
          .from('searches')
          .update({ status: 'timeout' })
          .eq('id', searchRecord.id);
      }
    };

    // Start background polling
    EdgeRuntime.waitUntil(pollForResults());

    return new Response(
      JSON.stringify({ 
        success: true, 
        search: searchRecord,
        websetId,
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
