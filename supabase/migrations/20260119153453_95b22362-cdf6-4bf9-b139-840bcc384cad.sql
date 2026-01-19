-- Tabela para armazenar tokens de verificação de email temporários
CREATE TABLE public.email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  full_name TEXT,
  password_hash TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX idx_email_verification_tokens_email ON public.email_verification_tokens(email);
CREATE INDEX idx_email_verification_tokens_token ON public.email_verification_tokens(token);
CREATE INDEX idx_email_verification_tokens_expires ON public.email_verification_tokens(expires_at);

-- Enable RLS - Ninguém pode acessar diretamente (só service role)
ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Nenhum acesso público (só service role nas edge functions pode acessar)
CREATE POLICY "No public access to email verification tokens"
  ON public.email_verification_tokens
  FOR ALL
  USING (false);

-- Função para limpar tokens expirados (executar periodicamente)
CREATE OR REPLACE FUNCTION public.cleanup_expired_email_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM public.email_verification_tokens
  WHERE expires_at < NOW() OR used = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;