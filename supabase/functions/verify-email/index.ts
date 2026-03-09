import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface VerifyRequest {
  token: string;
  password: string; // User re-enters password for security
}

Deno.serve(async (req): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, password }: VerifyRequest = await req.json();

    if (!token || !password) {
      return new Response(
        JSON.stringify({ error: "Token e senha são obrigatórios" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Find the token
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from("email_verification_tokens")
      .select("*")
      .eq("token", token)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (tokenError || !tokenData) {
      console.error("Token not found or expired:", tokenError);
      return new Response(
        JSON.stringify({ 
          error: "Link de verificação inválido ou expirado. Por favor, faça um novo cadastro." 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create the user with admin API
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: tokenData.email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: tokenData.full_name || "",
      },
    });

    if (createError) {
      console.error("Error creating user:", createError);
      
      if (createError.message?.includes("already been registered")) {
        return new Response(
          JSON.stringify({ error: "Este email já está cadastrado. Por favor, faça login." }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Erro ao criar conta. Tente novamente." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userId = userData.user?.id;
    console.log("User created successfully:", userId);

    // Create user subscription and usage records (trigger doesn't fire for Admin API)
    if (userId) {
      // Get free plan ID
      const { data: freePlan } = await supabaseAdmin
        .from("subscription_plans")
        .select("id")
        .eq("slug", "free")
        .single();

      if (freePlan) {
        // Create subscription
        const { error: subError } = await supabaseAdmin
          .from("user_subscriptions")
          .insert({
            user_id: userId,
            plan_id: freePlan.id,
            status: "active",
          })
          .select()
          .single();

        if (subError) {
          console.error("Error creating subscription:", subError);
        } else {
          console.log("Subscription created for user:", userId);
        }

        // Create usage record
        const { error: usageError } = await supabaseAdmin
          .from("user_usage")
          .insert({
            user_id: userId,
            searches_used_lifetime: 0,
            searches_used_monthly: 0,
          })
          .select()
          .single();

        if (usageError) {
          console.error("Error creating usage record:", usageError);
        } else {
          console.log("Usage record created for user:", userId);
        }
      } else {
        console.error("Free plan not found in database");
      }
    }

    // Mark token as used
    const { error: updateError } = await supabaseAdmin
      .from("email_verification_tokens")
      .update({ used: true })
      .eq("token", token);

    if (updateError) {
      console.error("Error marking token as used:", updateError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email verificado com sucesso!",
        email: tokenData.email
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in verify-email:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno do servidor" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
