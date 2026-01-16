-- Tabela de planos de assinatura
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  price_brl DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  features JSONB DEFAULT '[]'::jsonb,
  limits JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS para subscription_plans
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Política: todos podem ler os planos
CREATE POLICY "Anyone can read subscription plans" 
  ON public.subscription_plans 
  FOR SELECT 
  USING (true);

-- Pré-popular com os 2 planos
INSERT INTO public.subscription_plans (name, slug, price_brl, limits, features) VALUES
(
  'Free', 
  'free', 
  0.00, 
  '{"searches_lifetime": 3, "campaigns": 1}'::jsonb, 
  '[]'::jsonb
),
(
  'Starter', 
  'starter', 
  27.90, 
  '{"searches_monthly": 100, "campaigns": "unlimited"}'::jsonb, 
  '["export_csv", "whatsapp_click", "templates", "analytics"]'::jsonb
);

-- Tabela de assinaturas de usuários
CREATE TABLE public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'paused')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Habilitar RLS para user_subscriptions
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas para user_subscriptions
CREATE POLICY "Users can view their own subscription" 
  ON public.user_subscriptions 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription" 
  ON public.user_subscriptions 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert subscriptions" 
  ON public.user_subscriptions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Tabela de uso do usuário
CREATE TABLE public.user_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  searches_used_lifetime INTEGER DEFAULT 0,
  searches_used_monthly INTEGER DEFAULT 0,
  reset_date TIMESTAMPTZ,
  last_search_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS para user_usage
ALTER TABLE public.user_usage ENABLE ROW LEVEL SECURITY;

-- Políticas para user_usage
CREATE POLICY "Users can view their own usage" 
  ON public.user_usage 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage" 
  ON public.user_usage 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert usage" 
  ON public.user_usage 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Tabela de pagamentos PIX
CREATE TABLE public.pix_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  abacate_charge_id TEXT UNIQUE NOT NULL,
  amount_brl DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'EXPIRED')),
  br_code TEXT,
  br_code_base64 TEXT,
  expires_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_cpf TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS para pix_payments
ALTER TABLE public.pix_payments ENABLE ROW LEVEL SECURITY;

-- Políticas para pix_payments
CREATE POLICY "Users can view their own payments" 
  ON public.pix_payments 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payments" 
  ON public.pix_payments 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payments" 
  ON public.pix_payments 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Índices para performance
CREATE INDEX idx_user_subscriptions_user ON public.user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON public.user_subscriptions(status);
CREATE INDEX idx_user_usage_user ON public.user_usage(user_id);
CREATE INDEX idx_pix_payments_user ON public.pix_payments(user_id);
CREATE INDEX idx_pix_payments_charge ON public.pix_payments(abacate_charge_id);
CREATE INDEX idx_pix_payments_status ON public.pix_payments(status);

-- Função para criar subscription e usage automaticamente no signup
CREATE OR REPLACE FUNCTION public.handle_new_user_billing()
RETURNS TRIGGER AS $$
DECLARE
  free_plan_id UUID;
BEGIN
  -- Buscar ID do plano FREE
  SELECT id INTO free_plan_id FROM public.subscription_plans WHERE slug = 'free';
  
  -- Criar subscription com plano FREE
  INSERT INTO public.user_subscriptions (user_id, plan_id, status)
  VALUES (NEW.id, free_plan_id, 'active');
  
  -- Criar registro de usage
  INSERT INTO public.user_usage (user_id, searches_used_lifetime, searches_used_monthly)
  VALUES (NEW.id, 0, 0);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar billing records no signup
CREATE TRIGGER on_auth_user_created_billing
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_billing();

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_billing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_billing_updated_at();

CREATE TRIGGER update_pix_payments_updated_at
  BEFORE UPDATE ON public.pix_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_billing_updated_at();