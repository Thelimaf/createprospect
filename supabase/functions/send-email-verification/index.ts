import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerificationRequest {
  email: string;
  password: string;
  fullName?: string;
}

// Simple hash function for password
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, fullName }: VerificationRequest = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email e senha são obrigatórios" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Check if email already exists in auth.users
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error("Error checking existing users:", listError);
      // Continue anyway - don't reveal user existence
    }

    const emailExists = existingUsers?.users?.some(
      (user) => user.email?.toLowerCase() === email.toLowerCase()
    );

    if (emailExists) {
      // Don't reveal that email exists - show same success message
      console.log("Email already exists, returning generic message");
      return new Response(
        JSON.stringify({ success: true, message: "Se o email for válido, você receberá um link de verificação." }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Invalidate any previous tokens for this email
    const { error: deleteError } = await supabaseAdmin
      .from("email_verification_tokens")
      .delete()
      .eq("email", email.toLowerCase());

    if (deleteError) {
      console.error("Error deleting old tokens:", deleteError);
    }

    // Generate secure token
    const token = crypto.randomUUID() + crypto.randomUUID();
    
    // Hash password before storing
    const passwordHash = await hashPassword(password);
    
    // Set expiration to 1 hour from now
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    // Store verification token
    const { error: insertError } = await supabaseAdmin
      .from("email_verification_tokens")
      .insert({
        email: email.toLowerCase(),
        full_name: fullName || null,
        password_hash: passwordHash,
        token,
        expires_at: expiresAt,
        used: false,
      });

    if (insertError) {
      console.error("Error inserting token:", insertError);
      return new Response(
        JSON.stringify({ error: "Erro ao processar solicitação" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Build verification URL
    const baseUrl = req.headers.get("origin") || "https://createprospect.lovable.app";
    const verificationUrl = `${baseUrl}/verify-email?token=${token}`;

    // Send verification email
    const emailResponse = await resend.emails.send({
      from: "ProspectAI <noreply@resend.dev>",
      to: [email],
      subject: "Verifique seu email - ProspectAI",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0f; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background: linear-gradient(135deg, #1a1a2e 0%, #16162a 100%); border-radius: 16px; border: 1px solid rgba(139, 92, 246, 0.2); overflow: hidden;">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(168, 85, 247, 0.05) 100%);">
                      <div style="display: inline-block; padding: 12px; background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%); border-radius: 12px; margin-bottom: 20px;">
                        <span style="font-size: 24px;">✨</span>
                      </div>
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">ProspectAI</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 30px 40px;">
                      <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 24px; font-weight: 600; text-align: center;">
                        Verifique seu email
                      </h2>
                      <p style="margin: 0 0 25px; color: #a1a1aa; font-size: 16px; line-height: 1.6; text-align: center;">
                        ${fullName ? `Olá ${fullName}! ` : ''}Clique no botão abaixo para verificar seu email e ativar sua conta no ProspectAI.
                      </p>
                      
                      <!-- CTA Button -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 10px 0 30px;">
                            <a href="${verificationUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%); color: #ffffff; text-decoration: none; border-radius: 10px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);">
                              Verificar Email
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 0 0 15px; color: #71717a; font-size: 14px; text-align: center;">
                        Este link expira em <strong style="color: #a1a1aa;">1 hora</strong>.
                      </p>
                      
                      <p style="margin: 0; color: #52525b; font-size: 13px; text-align: center;">
                        Se você não solicitou esta verificação, ignore este email.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 25px 40px; background: rgba(0,0,0,0.2); border-top: 1px solid rgba(139, 92, 246, 0.1);">
                      <p style="margin: 0; color: #52525b; font-size: 12px; text-align: center;">
                        © 2024 ProspectAI. Todos os direitos reservados.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    console.log("Verification email sent:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Email de verificação enviado!" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-email-verification:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno do servidor" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);