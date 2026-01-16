-- Corrigir search_path das funções para segurança
CREATE OR REPLACE FUNCTION public.handle_new_user_billing()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.update_billing_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;