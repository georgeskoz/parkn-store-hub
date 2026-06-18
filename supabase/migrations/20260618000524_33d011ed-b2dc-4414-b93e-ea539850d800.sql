ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS host_id uuid,
  ADD COLUMN IF NOT EXISTS instant_book boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS amenities text[],
  ADD COLUMN IF NOT EXISTS avg_rating numeric,
  ADD COLUMN IF NOT EXISTS event_pricing_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS event_pricing jsonb,
  ADD COLUMN IF NOT EXISTS nearby_venues text[],
  ADD COLUMN IF NOT EXISTS size_sqft integer,
  ADD COLUMN IF NOT EXISTS price_hourly numeric,
  ADD COLUMN IF NOT EXISTS price_daily numeric,
  ADD COLUMN IF NOT EXISTS price_weekly numeric,
  ADD COLUMN IF NOT EXISTS price_monthly numeric;

ALTER TABLE public.listings ALTER COLUMN disclaimer_accepted DROP NOT NULL;
ALTER TABLE public.listings ALTER COLUMN disclaimer_accepted SET DEFAULT false;