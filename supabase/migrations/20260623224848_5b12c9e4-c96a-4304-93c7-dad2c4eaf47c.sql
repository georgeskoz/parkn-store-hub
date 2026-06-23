
CREATE TABLE IF NOT EXISTS public.listing_blocked_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  blocked_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (listing_id, blocked_date)
);

GRANT SELECT ON public.listing_blocked_dates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_blocked_dates TO authenticated;
GRANT ALL ON public.listing_blocked_dates TO service_role;

ALTER TABLE public.listing_blocked_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view blocked dates"
  ON public.listing_blocked_dates FOR SELECT
  USING (true);

CREATE POLICY "Hosts insert own blocked dates"
  ON public.listing_blocked_dates FOR INSERT
  TO authenticated
  WITH CHECK (public.user_owns_listing(listing_id, auth.uid()));

CREATE POLICY "Hosts delete own blocked dates"
  ON public.listing_blocked_dates FOR DELETE
  TO authenticated
  USING (public.user_owns_listing(listing_id, auth.uid()));

CREATE INDEX IF NOT EXISTS idx_listing_blocked_dates_listing ON public.listing_blocked_dates(listing_id, blocked_date);
