import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
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

    const { query, limit = 50, campaignId } = await req.json();

    if (!query) {
      throw new Error("Query is required");
    }

    console.log(`Scraping Google Maps for: "${query}" with limit ${limit}`);

    const serperApiKey = Deno.env.get("SERPER_API_KEY");
    if (!serperApiKey) {
      throw new Error("SERPER_API_KEY not configured");
    }

    // Call Serper.dev Google Maps API
    const serperResponse = await fetch("https://google.serper.dev/maps", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": serperApiKey,
      },
      body: JSON.stringify({
        q: query,
        num: Math.min(limit, 100), // Serper has a max of 100 per request
        hl: "pt",
        gl: "br",
      }),
    });

    if (!serperResponse.ok) {
      const errorText = await serperResponse.text();
      console.error("Serper API error:", errorText);
      throw new Error(`Serper API error: ${serperResponse.status}`);
    }

    const serperData = await serperResponse.json();
    console.log(`Received ${serperData.places?.length || 0} places from Serper`);

    const places = serperData.places || [];
    const leads = [];

    for (const place of places) {
      // Clean phone number - remove non-numeric characters
      let cleanPhone = place.phoneNumber?.replace(/\D/g, "") || null;
      
      // Ensure Brazilian phone format
      if (cleanPhone && cleanPhone.length === 10) {
        cleanPhone = "55" + cleanPhone;
      } else if (cleanPhone && cleanPhone.length === 11) {
        cleanPhone = "55" + cleanPhone;
      }

      // Extract city from address
      const addressParts = place.address?.split(",") || [];
      const city = addressParts.length >= 2 ? addressParts[addressParts.length - 2]?.trim() : null;
      const state = addressParts.length >= 1 ? addressParts[addressParts.length - 1]?.trim() : null;

      const lead = {
        user_id: user.id,
        campaign_id: campaignId || null,
        business_name: place.title,
        category: place.category,
        phone: cleanPhone,
        email: null, // Serper doesn't provide email
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
      };

      leads.push(lead);
    }

    console.log(`Processing ${leads.length} leads for upsert`);

    // Upsert leads using place_id as unique constraint
    let insertedCount = 0;
    let updatedCount = 0;

    for (const lead of leads) {
      const { data, error } = await supabaseClient
        .from("google_maps_leads")
        .upsert(lead, { onConflict: "place_id" })
        .select();

      if (error) {
        console.error(`Error upserting lead ${lead.business_name}:`, error);
      } else {
        insertedCount++;
      }
    }

    console.log(`Successfully upserted ${insertedCount} leads`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `${insertedCount} leads encontrados e salvos`,
        count: insertedCount,
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
