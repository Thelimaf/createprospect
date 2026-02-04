-- 1. Criar tabela de configuração da promoção
CREATE TABLE public.promo_config (
  id TEXT PRIMARY KEY DEFAULT 'beta_testers',
  max_beta_users INTEGER NOT NULL DEFAULT 10,
  current_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir configuração inicial
INSERT INTO promo_config (id, max_beta_users, current_count, is_active)
VALUES ('beta_testers', 10, 0, true);

-- RLS: apenas leitura pública
ALTER TABLE promo_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "promo_config_select" ON promo_config FOR SELECT USING (true);

-- 2. Adicionar campos na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN is_beta_tester BOOLEAN DEFAULT false,
ADD COLUMN beta_welcome_shown BOOLEAN DEFAULT false;

-- 3. Atualizar trigger de novo usuário para incluir lógica beta
CREATE OR REPLACE FUNCTION public.handle_new_user_setup()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  plan_id UUID;
  promo promo_config%ROWTYPE;
  is_beta BOOLEAN := false;
BEGIN
  -- Buscar configuração da promoção
  SELECT * INTO promo FROM promo_config WHERE id = 'beta_testers';
  
  -- Verificar se usuário se qualifica para beta
  IF promo.is_active AND promo.current_count < promo.max_beta_users THEN
    -- Atribuir plano Starter
    SELECT id INTO plan_id FROM subscription_plans WHERE slug = 'starter' LIMIT 1;
    is_beta := true;
    
    -- Incrementar contador
    UPDATE promo_config 
    SET current_count = current_count + 1, updated_at = NOW()
    WHERE id = 'beta_testers';
  ELSE
    -- Atribuir plano Free (padrão)
    SELECT id INTO plan_id FROM subscription_plans WHERE slug = 'free' LIMIT 1;
  END IF;
  
  -- Se não encontrou nenhum plano, usar fallback
  IF plan_id IS NULL THEN
    SELECT id INTO plan_id FROM subscription_plans WHERE slug = 'free' LIMIT 1;
  END IF;
  
  IF plan_id IS NULL THEN
    RAISE WARNING 'No plan found, skipping user setup for user %', NEW.id;
    RETURN NEW;
  END IF;
  
  -- Criar subscription
  INSERT INTO user_subscriptions (user_id, plan_id, status, upgrade_source)
  VALUES (
    NEW.id, 
    plan_id, 
    'active', 
    CASE WHEN is_beta THEN 'beta_tester' ELSE NULL END
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Criar usage
  INSERT INTO user_usage (user_id, searches_used_lifetime, searches_used_monthly)
  VALUES (NEW.id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- 4. Atualizar trigger handle_new_user para incluir flag beta
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  promo promo_config%ROWTYPE;
  is_beta BOOLEAN := false;
BEGIN
  -- Buscar configuração da promoção para determinar se é beta tester
  SELECT * INTO promo FROM promo_config WHERE id = 'beta_testers';
  
  -- Verificar se usuário se qualifica para beta (contagem é incrementada no handle_new_user_setup)
  IF promo.is_active AND promo.current_count < promo.max_beta_users THEN
    is_beta := true;
  END IF;

  INSERT INTO public.profiles (id, full_name, avatar_url, is_beta_tester, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
    is_beta,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    is_beta_tester = EXCLUDED.is_beta_tester,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;