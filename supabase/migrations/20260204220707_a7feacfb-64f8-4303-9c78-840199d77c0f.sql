-- Remover a constraint única global no place_id
ALTER TABLE public.google_maps_leads 
DROP CONSTRAINT IF EXISTS google_maps_leads_place_id_key;

-- Criar nova constraint composta (user_id + place_id)
-- Isso permite que cada usuário tenha seu próprio registro do mesmo place_id
CREATE UNIQUE INDEX IF NOT EXISTS google_maps_leads_user_place_unique 
ON public.google_maps_leads (user_id, place_id) 
WHERE place_id IS NOT NULL;