-- Add column to track upgrade source (payment vs admin grant)
ALTER TABLE public.user_subscriptions 
ADD COLUMN IF NOT EXISTS upgrade_source TEXT DEFAULT 'admin_grant';

-- Add comment for documentation
COMMENT ON COLUMN public.user_subscriptions.upgrade_source IS 'Origem do upgrade: payment (PIX pago) ou admin_grant (cortesia do admin)';