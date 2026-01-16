-- Create google_maps_searches table for tracking search history
CREATE TABLE public.google_maps_searches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  campaign_id UUID,
  query TEXT NOT NULL,
  total_results INTEGER DEFAULT 0,
  new_leads INTEGER DEFAULT 0,
  duplicates INTEGER DEFAULT 0,
  updated_leads INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.google_maps_searches ENABLE ROW LEVEL SECURITY;

-- RLS policies for google_maps_searches
CREATE POLICY "Users can manage own searches" 
ON public.google_maps_searches 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add new columns to google_maps_leads
ALTER TABLE public.google_maps_leads ADD COLUMN IF NOT EXISTS seen_at TIMESTAMPTZ;
ALTER TABLE public.google_maps_leads ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMPTZ;
ALTER TABLE public.google_maps_leads ADD COLUMN IF NOT EXISTS possible_duplicate_of UUID;
ALTER TABLE public.google_maps_leads ADD COLUMN IF NOT EXISTS duplicate_score NUMERIC;
ALTER TABLE public.google_maps_leads ADD COLUMN IF NOT EXISTS search_id UUID;

-- Add duplicate_behavior to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS duplicate_behavior TEXT DEFAULT 'ignore';

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_gm_leads_place_id ON public.google_maps_leads(place_id);
CREATE INDEX IF NOT EXISTS idx_gm_leads_created_at ON public.google_maps_leads(created_at);
CREATE INDEX IF NOT EXISTS idx_gm_leads_user_campaign ON public.google_maps_leads(user_id, campaign_id);
CREATE INDEX IF NOT EXISTS idx_gm_leads_seen_at ON public.google_maps_leads(seen_at);
CREATE INDEX IF NOT EXISTS idx_gm_leads_search_id ON public.google_maps_leads(search_id);
CREATE INDEX IF NOT EXISTS idx_gm_leads_possible_duplicate ON public.google_maps_leads(possible_duplicate_of);
CREATE INDEX IF NOT EXISTS idx_gm_searches_query ON public.google_maps_searches(user_id, query, created_at);
CREATE INDEX IF NOT EXISTS idx_gm_searches_user ON public.google_maps_searches(user_id);