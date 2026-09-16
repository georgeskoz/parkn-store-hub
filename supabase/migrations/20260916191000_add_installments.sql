-- "Pay in installments": a booking still has a fixed start/end date, but its
-- total is split into weekly or monthly installments across that period
-- instead of being charged in full up front. Host opts in per listing
-- (mirrors the existing instant_book toggle); only installment 1 is charged
-- at booking time, the rest are rows here that charge-installments (new
-- edge function) picks up as they come due.
--
-- Verify actual column/table names against information_schema.columns
-- before running in a shell you're unsure about -- this schema has drifted
-- from tracked migrations before (host_id, platform_fee, tax_amount, etc.
-- were all added directly in prod outside any migration file).

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS allow_installments boolean DEFAULT false;

CREATE TABLE IF NOT EXISTS public.booking_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  sequence integer NOT NULL,               -- 1-based; 1 = charged at booking time
  due_date date NOT NULL,
  amount numeric NOT NULL,                 -- host's clean rental share, pre-fee, pre-tax
  platform_fee numeric NOT NULL,
  tax_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL,           -- amount + platform_fee + tax_amount, what's actually charged
  status text NOT NULL DEFAULT 'pending',  -- pending | succeeded | failed
  stripe_payment_intent_id text,
  host_payout_amount numeric,
  host_transfer_id text,
  released_at timestamptz,
  charged_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id, sequence)
);

ALTER TABLE public.booking_installments ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.booking_installments TO authenticated;
GRANT ALL ON public.booking_installments TO service_role;

CREATE POLICY "Parties can view their booking installments"
  ON public.booking_installments FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_installments.booking_id
      AND (b.renter_id = auth.uid() OR b.host_id = auth.uid())
  ));

CREATE INDEX IF NOT EXISTS idx_booking_installments_due
  ON public.booking_installments (status, due_date)
  WHERE status = 'pending';

-- Renter visibility: allow_installments needs to be readable by anon/
-- authenticated the same way instant_book already is (see
-- src/lib/listingsAnonColumns.ts's ANON_SAFE_LISTING_COLUMNS, which also
-- needs this column added -- that's a separate code change, not SQL).
GRANT SELECT (allow_installments) ON public.listings TO anon;
GRANT SELECT (allow_installments) ON public.listings TO authenticated;

-- Verify after running:
--   select column_name from information_schema.columns where table_name = 'listings' and column_name = 'allow_installments';
--   select table_name from information_schema.tables where table_name = 'booking_installments';
