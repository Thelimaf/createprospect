ALTER TABLE google_maps_leads ADD COLUMN IF NOT EXISTS source text DEFAULT 'google_maps';

COMMENT ON COLUMN google_maps_leads.source IS 'Fonte do lead: google_maps, firecrawl_web, cnpj_lookup';