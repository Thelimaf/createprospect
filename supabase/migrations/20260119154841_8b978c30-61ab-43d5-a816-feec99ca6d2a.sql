-- Criar função para limpar tokens expirados
CREATE OR REPLACE FUNCTION public.cleanup_expired_email_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.email_verification_tokens
  WHERE expires_at < now() OR used = true;
END;
$$;