-- Create function to handle new user setup
CREATE OR REPLACE FUNCTION public.handle_new_user_setup()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  free_plan_id UUID;
BEGIN
  -- Get the free plan ID
  SELECT id INTO free_plan_id FROM public.subscription_plans WHERE slug = 'free' LIMIT 1;
  
  -- If no free plan exists, use a fallback (shouldn't happen)
  IF free_plan_id IS NULL THEN
    RAISE WARNING 'Free plan not found, skipping user setup for user %', NEW.id;
    RETURN NEW;
  END IF;
  
  -- Create user subscription with free plan
  INSERT INTO public.user_subscriptions (user_id, plan_id, status)
  VALUES (NEW.id, free_plan_id, 'active')
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Create user usage record
  INSERT INTO public.user_usage (user_id, searches_used_lifetime, searches_used_monthly)
  VALUES (NEW.id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users for new signups
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_setup();