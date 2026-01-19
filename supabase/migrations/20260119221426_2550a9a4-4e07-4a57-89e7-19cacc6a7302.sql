-- Add columns for CNPJ enrichment data
ALTER TABLE public.google_maps_leads ADD COLUMN IF NOT EXISTS cnpj text;
ALTER TABLE public.google_maps_leads ADD COLUMN IF NOT EXISTS razao_social text;
ALTER TABLE public.google_maps_leads ADD COLUMN IF NOT EXISTS nome_fantasia text;
ALTER TABLE public.google_maps_leads ADD COLUMN IF NOT EXISTS cnpj_status text;
ALTER TABLE public.google_maps_leads ADD COLUMN IF NOT EXISTS cnae_principal text;
ALTER TABLE public.google_maps_leads ADD COLUMN IF NOT EXISTS socios jsonb;
ALTER TABLE public.google_maps_leads ADD COLUMN IF NOT EXISTS capital_social numeric;
ALTER TABLE public.google_maps_leads ADD COLUMN IF NOT EXISTS data_abertura date;

-- Add column for Firecrawl website scrape data
ALTER TABLE public.google_maps_leads ADD COLUMN IF NOT EXISTS scrape_data jsonb;

-- Add index for CNPJ lookups
CREATE INDEX IF NOT EXISTS idx_google_maps_leads_cnpj ON public.google_maps_leads(cnpj);

-- Comment on columns for documentation
COMMENT ON COLUMN public.google_maps_leads.cnpj IS 'CNPJ number from Brasil API';
COMMENT ON COLUMN public.google_maps_leads.razao_social IS 'Legal company name from Brasil API';
COMMENT ON COLUMN public.google_maps_leads.socios IS 'Company partners/shareholders from Brasil API QSA';
COMMENT ON COLUMN public.google_maps_leads.scrape_data IS 'Website content scraped via Firecrawl';