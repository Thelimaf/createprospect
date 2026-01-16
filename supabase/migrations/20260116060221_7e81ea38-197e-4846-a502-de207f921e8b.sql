-- Create google_maps_leads table
CREATE TABLE public.google_maps_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  business_name TEXT NOT NULL,
  category TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  google_maps_url TEXT,
  place_id TEXT UNIQUE,
  rating DECIMAL,
  reviews_count INTEGER,
  status TEXT NOT NULL DEFAULT 'new',
  notes TEXT,
  last_contact_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.google_maps_leads ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own leads"
ON public.google_maps_leads
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own leads"
ON public.google_maps_leads
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own leads"
ON public.google_maps_leads
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own leads"
ON public.google_maps_leads
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_google_maps_leads_updated_at
BEFORE UPDATE ON public.google_maps_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.google_maps_leads;