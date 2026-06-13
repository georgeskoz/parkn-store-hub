
-- 1. Add status column
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved';

ALTER TABLE public.listings
  DROP CONSTRAINT IF EXISTS listings_status_check;
ALTER TABLE public.listings
  ADD CONSTRAINT listings_status_check CHECK (status IN ('pending','approved','rejected'));

CREATE INDEX IF NOT EXISTS listings_status_idx ON public.listings(status);
CREATE INDEX IF NOT EXISTS listings_category_status_idx ON public.listings(category, status);

-- 2. Public read policy restricted to approved listings
DROP POLICY IF EXISTS "Public can view listings" ON public.listings;
DROP POLICY IF EXISTS "Anyone can view listings" ON public.listings;
DROP POLICY IF EXISTS "Public can view approved listings" ON public.listings;

CREATE POLICY "Public can view approved listings"
  ON public.listings FOR SELECT
  USING (status = 'approved' OR auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.listings TO anon;

-- 3. Seed 4 demo listings (idempotent — skip if titles already exist)
INSERT INTO public.listings
  (user_id, category, type, title, description, address, city, province, country, region, lat, lng,
   features, availability, spots, size, sqft, hourly, daily, weekly, monthly, seasonal, photos,
   nearby_landmarks, disclaimer_accepted, status)
SELECT * FROM (VALUES
  (
    '10f34449-83d3-4e5d-85d6-f3f51e634922'::uuid, 'parking', 'underground',
    'Downtown Montreal Underground Garage',
    'Secure heated underground parking steps from Sainte-Catherine Street. 24/7 keypad access and EV charging available.',
    '1200 Rue Peel', 'Montreal', 'Quebec', 'Canada', 'Downtown',
    45.5017::numeric, -73.5673::numeric,
    ARRAY['EV Charging','24/7 Access','Security Camera','Heated','Keypad Entry'],
    'available', 4, NULL, NULL,
    5::numeric, 25::numeric, 140::numeric, 280::numeric, NULL,
    '[]'::jsonb,
    ARRAY['Place des Arts','McGill University','Bell Centre'],
    true, 'approved'
  ),
  (
    '10f34449-83d3-4e5d-85d6-f3f51e634922'::uuid, 'parking', 'outdoor',
    'Old Quebec Tourist Lot — Walk to Château Frontenac',
    'Outdoor secured lot in the heart of the historic district. Perfect for tourists visiting Old Quebec.',
    '15 Rue Dalhousie', 'Quebec City', 'Quebec', 'Canada', 'Old Quebec',
    46.8139::numeric, -71.2080::numeric,
    ARRAY['Tourist Area','Secured','Well-lit','Walkable'],
    'limited', 2, NULL, NULL,
    4::numeric, 22::numeric, 120::numeric, 240::numeric, NULL,
    '[]'::jsonb,
    ARRAY['Château Frontenac','Place Royale','Petit Champlain'],
    true, 'approved'
  ),
  (
    '10f34449-83d3-4e5d-85d6-f3f51e634922'::uuid, 'storage', 'heated',
    'Heated Garage Storage Unit — Plateau Mont-Royal',
    'Clean heated garage space in a quiet Plateau residential area. Ideal for seasonal items, furniture or motorcycles.',
    '4321 Rue Saint-Denis', 'Montreal', 'Quebec', 'Canada', 'Plateau',
    45.5225::numeric, -73.5700::numeric,
    ARRAY['Heated','24/7 Access','Security Camera','Dry','Ground Floor'],
    'available', NULL, '10x20', 200,
    NULL, 12::numeric, 65::numeric, 220::numeric, 780::numeric,
    '[]'::jsonb,
    ARRAY['Mount Royal Park','Saint-Louis Square'],
    true, 'approved'
  ),
  (
    '10f34449-83d3-4e5d-85d6-f3f51e634922'::uuid, 'storage', 'outdoor',
    'Sherbrooke Fenced Outdoor Lot — Trailers & Equipment',
    'Affordable fenced outdoor storage suitable for trailers, boats, RVs and seasonal equipment. Drive-in access.',
    '340 Rue King Ouest', 'Sherbrooke', 'Quebec', 'Canada', 'Fleurimont',
    45.3794::numeric, -71.9294::numeric,
    ARRAY['Fenced','Drive-in Access','Affordable','RV/Boat Friendly'],
    'available', NULL, '15x15', 225,
    NULL, 5::numeric, 28::numeric, 90::numeric, 320::numeric,
    '[]'::jsonb,
    ARRAY['Université de Sherbrooke','Carrefour de l''Estrie'],
    true, 'approved'
  )
) AS v(user_id, category, type, title, description, address, city, province, country, region, lat, lng,
       features, availability, spots, size, sqft, hourly, daily, weekly, monthly, seasonal, photos,
       nearby_landmarks, disclaimer_accepted, status)
WHERE NOT EXISTS (
  SELECT 1 FROM public.listings l WHERE l.title = v.title
);
