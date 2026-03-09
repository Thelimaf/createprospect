import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();

    console.log('Received webhook event:', JSON.stringify(payload, null, 2));

    const eventType = payload.type;
    const websetId = payload.data?.webset?.id || payload.data?.id;

    if (!websetId) {
      console.log('No webset ID found in payload');
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing event: ${eventType} for webset: ${websetId}`);

    // Use service role key to bypass RLS
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find the search record by webset_id
    const { data: search, error: searchError } = await supabaseClient
      .from('searches')
      .select('*')
      .eq('webset_id', websetId)
      .single();

    if (searchError || !search) {
      console.error('Search not found for webset:', websetId, searchError);
      return new Response(JSON.stringify({ error: 'Search not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Found search record:', search.id);

    // Handle webset.idle event - search is complete
    if (eventType === 'webset.idle' || eventType === 'webset.updated') {
      const websetStatus = payload.data?.status;

      if (websetStatus === 'idle') {
        console.log('Webset is idle, fetching all items...');

        const exaApiKey = Deno.env.get('EXA_API_KEY');
        if (!exaApiKey) {
          throw new Error('EXA_API_KEY not configured');
        }

        // Fetch all items from the webset
        const itemsResponse = await fetch(
          `https://api.exa.ai/websets/v0/websets/${websetId}/items`,
          {
            headers: {
              'x-api-key': exaApiKey,
            },
          }
        );

        if (!itemsResponse.ok) {
          const error = await itemsResponse.text();
          console.error('Failed to fetch webset items:', error);
          throw new Error(`Failed to fetch items: ${error}`);
        }

        const itemsData = await itemsResponse.json();
        console.log('Fetched items count:', itemsData.data?.length || 0);

        // Store results in database
        if (itemsData.data && itemsData.data.length > 0) {
          const results = itemsData.data.map((item: {
            id: string;
            url?: string;
            properties?: {
              name?: string;
            };
            enrichments?: unknown;
            sourceContent?: {
              title?: string;
            };
          }) => ({
            search_id: search.id,
            item_id: item.id,
            name: item.properties?.name || item.sourceContent?.title || 'Unknown',
            url: item.url || '',
            enrichment_data: {
              ...item.properties,
              enrichments: item.enrichments,
              sourceContent: item.sourceContent,
            },
          }));

          console.log('Storing results:', results.length);

          const { error: insertError } = await supabaseClient
            .from('search_results')
            .upsert(results, { onConflict: 'item_id' });

          if (insertError) {
            console.error('Error storing results:', insertError);
          } else {
            console.log('Results stored successfully');
          }

          // Update search status
          const { error: updateError } = await supabaseClient
            .from('searches')
            .update({
              status: 'completed',
              result_count: results.length,
            })
            .eq('id', search.id);

          if (updateError) {
            console.error('Error updating search status:', updateError);
          } else {
            console.log('Search status updated to completed');
          }
        } else {
          // No items found, still mark as completed
          await supabaseClient
            .from('searches')
            .update({
              status: 'completed',
              result_count: 0,
            })
            .eq('id', search.id);

          console.log('Search completed with 0 results');
        }
      }
    }

    // Handle individual item creation events
    if (eventType === 'webset.item.created') {
      const item = payload.data;

      if (item) {
        console.log('Processing new item:', item.id);

        const result = {
          search_id: search.id,
          item_id: item.id,
          name: item.properties?.name || item.sourceContent?.title || 'Unknown',
          url: item.url || '',
          enrichment_data: {
            ...item.properties,
            enrichments: item.enrichments,
            sourceContent: item.sourceContent,
          },
        };

        const { error: insertError } = await supabaseClient
          .from('search_results')
          .upsert([result], { onConflict: 'item_id' });

        if (insertError) {
          console.error('Error storing item:', insertError);
        } else {
          console.log('Item stored successfully');
        }

        // Update result count
        const { count } = await supabaseClient
          .from('search_results')
          .select('*', { count: 'exact', head: true })
          .eq('search_id', search.id);

        await supabaseClient
          .from('searches')
          .update({ result_count: count || 0 })
          .eq('id', search.id);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in exa-webhook:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
