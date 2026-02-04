-- Remove the partial index that doesn't work with ON CONFLICT
DROP INDEX IF EXISTS google_maps_leads_user_place_unique;

-- Create a full unique index (without WHERE clause) that works with upsert
CREATE UNIQUE INDEX google_maps_leads_user_place_unique 
ON public.google_maps_leads (user_id, place_id);