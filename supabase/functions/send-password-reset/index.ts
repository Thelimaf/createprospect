import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  email: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json() as RequestBody;

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user exists
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error("Error fetching users:", userError);
      return new Response(
        JSON.stringify({ error: "Erro ao verificar usuário" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const user = users.users.find(u => u.email === email);
    
    if (!user) {
      // Return success even if user doesn't exist (security: don't reveal if email exists)
      return new Response(
        JSON.stringify({ success: true, message: "Se o email existir, você receberá um link de recuperação" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Invalidate any existing tokens for this email
    await supabase
      .from("password_reset_tokens")
      .update({ used: true })
      .eq("email", email)
      .eq("used", false);

    // Generate a secure token
    const token = crypto.randomUUID() + "-" + crypto.randomUUID();
    
    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    // Save token to database
    const { error: insertError } = await supabase
      .from("password_reset_tokens")
      .insert({
        user_id: user.id,
        email: email,
        token: token,
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error("Error saving token:", insertError);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar token de recuperação" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build reset URL
    const resetUrl = `${req.headers.get("origin") || "https://createprospect.lovable.app"}/reset-password?token=${token}`;

    // Send email via Resend
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ProspectAI <noreply@resend.dev>",
        to: [email],
        subject: "Redefinir sua senha - ProspectAI",
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <tr>
      <td style="background-color: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        
        <!-- Logo -->
        <div style="text-align: center; margin-bottom: 32px;">
          <span style="font-size: 28px; font-weight: bold; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
            ✨ ProspectAI
          </span>
        </div>

        <!-- Heading -->
        <h1 style="color: #18181b; font-size: 24px; font-weight: 600; text-align: center; margin: 0 0 16px 0;">
          Redefinir sua senha
        </h1>

        <!-- Description -->
        <p style="color: #71717a; font-size: 16px; line-height: 24px; text-align: center; margin: 0 0 32px 0;">
          Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha.
        </p>

        <!-- CTA Button -->
        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">
            Redefinir Senha
          </a>
        </div>

        <!-- Expiration notice -->
        <p style="color: #a1a1aa; font-size: 14px; text-align: center; margin: 0 0 24px 0;">
          ⏰ Este link expira em <strong>1 hora</strong>
        </p>

        <!-- Divider -->
        <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;">

        <!-- Security notice -->
        <p style="color: #a1a1aa; font-size: 13px; text-align: center; margin: 0;">
          Se você não solicitou esta alteração, ignore este email. Sua senha permanecerá a mesma.
        </p>

      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="padding: 24px; text-align: center;">
        <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
          © ${new Date().getFullYear()} ProspectAI. Todos os direitos reservados.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error("Resend error:", errorData);
      return new Response(
        JSON.stringify({ error: "Erro ao enviar email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Email de recuperação enviado com sucesso" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in send-password-reset:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
