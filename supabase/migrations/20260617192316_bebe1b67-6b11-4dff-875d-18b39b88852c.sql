
-- Parking availability slots (weekly schedule with multiple time ranges per day)
CREATE TABLE public.listing_availability_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_listing_availability_slots_listing ON public.listing_availability_slots(listing_id);

GRANT SELECT ON public.listing_availability_slots TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_availability_slots TO authenticated;
GRANT ALL ON public.listing_availability_slots TO service_role;

ALTER TABLE public.listing_availability_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view availability slots"
  ON public.listing_availability_slots FOR SELECT USING (true);

CREATE POLICY "Hosts manage own slots"
  ON public.listing_availability_slots FOR ALL
  USING (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid()));

-- Storage rental terms (one row per listing)
CREATE TABLE public.listing_rental_terms (
  listing_id uuid PRIMARY KEY REFERENCES public.listings(id) ON DELETE CASCADE,
  min_months integer NOT NULL DEFAULT 1,
  start_date date,
  seasonal boolean NOT NULL DEFAULT false,
  season_start_month smallint CHECK (season_start_month BETWEEN 1 AND 12),
  season_end_month smallint CHECK (season_end_month BETWEEN 1 AND 12),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.listing_rental_terms TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_rental_terms TO authenticated;
GRANT ALL ON public.listing_rental_terms TO service_role;

ALTER TABLE public.listing_rental_terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view rental terms"
  ON public.listing_rental_terms FOR SELECT USING (true);

CREATE POLICY "Hosts manage own rental terms"
  ON public.listing_rental_terms FOR ALL
  USING (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid()));

CREATE TRIGGER update_listing_rental_terms_updated_at
  BEFORE UPDATE ON public.listing_rental_terms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
