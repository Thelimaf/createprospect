-- Add quick_replies field to campaigns table for storing quick reply templates
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS quick_replies JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.campaigns.quick_replies IS 'Array of quick reply templates with text and variable placeholders';