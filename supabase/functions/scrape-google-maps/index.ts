import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Country codes mapping (ISO 3166-1 alpha-2 → DDI)
const COUNTRY_CODES: Record<string, string> = {
  br: "55",  // Brazil
  us: "1",   // USA
  ca: "1",   // Canada
  mx: "52",  // Mexico
  ar: "54",  // Argentina
  pt: "351", // Portugal
  es: "34",  // Spain
  uk: "44",  // UK
  de: "49",  // Germany
  fr: "33",  // France
  it: "39",  // Italy
  cl: "56",  // Chile
  co: "57",  // Colombia
  pe: "51",  // Peru
  uy: "598", // Uruguay
};

// Known country code prefixes for validation
const KNOWN_PREFIXES = ["1", "33", "34", "39", "44", "49", "51", "52", "54", "55", "56", "57", "351", "598"];

// Check if phone number already starts with a known country code
function startsWithKnownCountryCode(phone: string): boolean {
  for (const prefix of KNOWN_PREFIXES) {
    if (phone.startsWith(prefix)) {
      // Additional validation: phone should be long enough to include country code + number
      const expectedMinLength = prefix.length + 8; // At least 8 more digits after country code
      if (phone.length >= expectedMinLength) {
        return true;
      }
    }
  }
  return false;
}

// Helper to check if value is better (non-null/non-empty)
function getBetterValue<T>(existing: T | null | undefined, newVal: T | null | undefined): T | null | undefined {
  if (newVal !== null && newVal !== undefined && newVal !== "") {
    return newVal;
  }
  return existing;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { 
      query, 
      limit = 20, 
      page = 1, 
      campaignId, 
      mode = "normal", 
      checkRecent = false,
      country = "br" // Default to Brazil for backwards compatibility
    } = await req.json();

    if (!query) {
      throw new Error("Query is required");
    }

    // Get country code for phone normalization
    const countryCode = COUNTRY_CODES[country] || "55";
    console.log(`Using country: ${country}, DDI: ${countryCode}`);

    // LAYER 3: Check for recent search if requested
    if (checkRecent) {
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const { data: recentSearch } = await supabaseClient
        .from("google_maps_searches")
        .select("*")
        .eq("user_id", user.id)
        .eq("query", query)
        .gte("created_at", twentyFourHoursAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (recentSearch) {
        const hoursAgo = Math.round((Date.now() - new Date(recentSearch.created_at).getTime()) / (1000 * 60 * 60));
        return new Response(
          JSON.stringify({
            hasRecentSearch: true,
            recentSearch: {
              id: recentSearch.id,
              query: recentSearch.query,
              hoursAgo,
              totalResults: recentSearch.total_results,
              newLeads: recentSearch.new_leads,
              duplicates: recentSearch.duplicates,
              updatedLeads: recentSearch.updated_leads,
            },
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }

      // No recent search found, return that info
      return new Response(
        JSON.stringify({ hasRecentSearch: false }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // LAYER 2: Use 'start' parameter for proper pagination
    const start = (page - 1) * 20;
    console.log(`Scraping Google Maps for: "${query}" with limit ${limit}, page ${page}, start ${start}, mode ${mode}, country ${country}`);

    const serperApiKey = Deno.env.get("SERPER_API_KEY");
    if (!serperApiKey) {
      throw new Error("SERPER_API_KEY not configured");
    }

    // Call Serper.dev Google Maps API with dynamic country settings
    const serperResponse = await fetch("https://google.serper.dev/maps", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": serperApiKey,
      },
      body: JSON.stringify({
        q: query,
        num: Math.min(limit, 20),
        ...(start > 0 && { start }), // Only include start if > 0
        hl: country === "br" ? "pt" : (country === "es" || country === "mx" || country === "ar" ? "es" : "en"),
        gl: country, // Dynamic geolocation based on country parameter
      }),
    });

    if (!serperResponse.ok) {
      const errorText = await serperResponse.text();
      console.error("Serper API error:", errorText);
      throw new Error(`Serper API error: ${serperResponse.status}`);
    }

    const serperData = await serperResponse.json();
    console.log(`Received ${serperData.places?.length || 0} places from Serper`);

    const allPlaces = serperData.places || [];
    
    // CRITICAL: Limit results to exactly what the user requested
    // Serper always returns up to 20 results regardless of 'num' parameter
    const placesToProcess = allPlaces.slice(0, limit);
    console.log(`Processing ${placesToProcess.length} of ${allPlaces.length} places (user limit: ${limit})`);

    // Create a search record first
    const { data: searchRecord, error: searchError } = await supabaseClient
      .from("google_maps_searches")
      .insert({
        user_id: user.id,
        campaign_id: campaignId || null,
        query: query,
        total_results: 0,
        new_leads: 0,
        duplicates: 0,
        updated_leads: 0,
      })
      .select()
      .single();

    if (searchError) {
      console.error("Error creating search record:", searchError);
    }

    const searchId = searchRecord?.id;

    // LAYER 4: Track statistics
    let newCount = 0;
    let existingCount = 0;
    let updatedCount = 0;

    for (const place of placesToProcess) {
      // Clean phone number - remove non-numeric characters but preserve + prefix
      let cleanPhone = place.phoneNumber?.replace(/[^\d+]/g, "") || null;
      
      // Smart phone normalization based on country
      if (cleanPhone) {
        // If starts with +, remove it (already has country code)
        if (cleanPhone.startsWith('+')) {
          cleanPhone = cleanPhone.slice(1);
        } 
        // Check if already has a valid country code
        else if (!startsWithKnownCountryCode(cleanPhone)) {
          // Remove leading zeros (common in some countries)
          cleanPhone = cleanPhone.replace(/^0+/, '');
          // Add the appropriate country code
          cleanPhone = countryCode + cleanPhone;
        }
        // If it already starts with a known code, keep it as is
      }

      // Extract city from address
      const addressParts = place.address?.split(",") || [];
      const city = addressParts.length >= 2 ? addressParts[addressParts.length - 2]?.trim() : null;
      const state = addressParts.length >= 1 ? addressParts[addressParts.length - 1]?.trim() : null;

      // LAYER 1 & 8: Check if lead already exists FOR THIS USER for smart merge
      const { data: existingLead } = await supabaseClient
        .from("google_maps_leads")
        .select("*")
        .eq("user_id", user.id)
        .eq("place_id", place.placeId)
        .maybeSingle();

      if (existingLead) {
        // Lead already exists
        if (mode === "update") {
          // LAYER 8: Smart merge - update with better values
          const hasNewData = 
            (!existingLead.email && place.email) ||
            (!existingLead.website && place.website) ||
            (!existingLead.phone && cleanPhone) ||
            (place.rating && place.rating !== existingLead.rating) ||
            (place.ratingCount && place.ratingCount !== existingLead.reviews_count);

          if (hasNewData) {
            const { error: updateError } = await supabaseClient
              .from("google_maps_leads")
              .update({
                email: getBetterValue(existingLead.email, place.email),
                website: getBetterValue(existingLead.website, place.website),
                phone: getBetterValue(existingLead.phone, cleanPhone),
                rating: getBetterValue(existingLead.rating, place.rating),
                reviews_count: getBetterValue(existingLead.reviews_count, place.ratingCount),
                address: getBetterValue(existingLead.address, place.address),
                enriched_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                search_id: searchId,
              })
              .eq("id", existingLead.id);

            if (!updateError) {
              updatedCount++;
            }
          } else {
            existingCount++;
          }
        } else {
          // Normal mode - just count as existing
          existingCount++;
        }
      } else {
        // New lead - insert it
        const lead = {
          user_id: user.id,
          campaign_id: campaignId || null,
          search_id: searchId,
          business_name: place.title,
          category: place.category,
          phone: cleanPhone,
          email: null,
          website: place.website || null,
          address: place.address,
          city: city,
          state: state,
          zip_code: null,
          latitude: place.position?.lat || null,
          longitude: place.position?.lng || null,
          google_maps_url: place.cid ? `https://www.google.com/maps?cid=${place.cid}` : null,
          place_id: place.placeId,
          rating: place.rating || null,
          reviews_count: place.ratingCount || null,
          status: "new",
          source: "google_maps",
        };

        // Use upsert with composite key (user_id, place_id) to avoid conflicts
        const { error: upsertError } = await supabaseClient
          .from("google_maps_leads")
          .upsert(lead, { 
            onConflict: 'user_id,place_id',
            ignoreDuplicates: false 
          });

        if (!upsertError) {
          newCount++;
        } else {
          console.error(`Error upserting lead ${lead.business_name}:`, upsertError);
        }
      }
    }

    // Update search record with stats
    if (searchId) {
      await supabaseClient
        .from("google_maps_searches")
        .update({
          total_results: newCount + existingCount + updatedCount,
          new_leads: newCount,
          duplicates: existingCount,
          updated_leads: updatedCount,
        })
        .eq("id", searchId);
    }

    console.log(`Stats: ${newCount} new, ${existingCount} existing, ${updatedCount} updated`);

    // hasMore is true if Serper returned a full page (20) AND we processed the full limit
    const hasMore = allPlaces.length === 20 && placesToProcess.length === limit;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Busca concluída`,
        leads_saved: newCount,
        count: newCount + existingCount + updatedCount,
        stats: {
          new: newCount,
          existing: existingCount,
          updated: updatedCount,
        },
        page: page,
        hasMore: hasMore,
        searchId: searchId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in scrape-google-maps:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
