
-- 1. Bookings additions
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS escrow_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS auto_release_at timestamptz,
  ADD COLUMN IF NOT EXISTS released_at timestamptz,
  ADD COLUMN IF NOT EXISTS released_transfer_id text,
  ADD COLUMN IF NOT EXISTS overdue_charges_total numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_overdue_charge_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_by_provider_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_by_seeker_at timestamptz,
  ADD COLUMN IF NOT EXISTS dispute_opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS dispute_reason text,
  ADD COLUMN IF NOT EXISTS stripe_payment_method_id text,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_session_id text,
  ADD COLUMN IF NOT EXISTS payout_amount numeric;

-- 2. booking_extensions
CREATE TABLE IF NOT EXISTS public.booking_extensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL,
  extra_hours integer NOT NULL CHECK (extra_hours > 0),
  rate text NOT NULL,
  extra_units numeric NOT NULL,
  extra_amount numeric NOT NULL,
  new_end_date timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  stripe_session_id text,
  payment_intent_id text,
  responded_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.booking_extensions TO authenticated;
GRANT ALL ON public.booking_extensions TO service_role;
ALTER TABLE public.booking_extensions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties can view extensions"
  ON public.booking_extensions FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_extensions.booking_id
      AND (b.seeker_id = auth.uid() OR b.provider_id = auth.uid())
  ));

CREATE POLICY "Seeker can request extension"
  ON public.booking_extensions FOR INSERT
  TO authenticated
  WITH CHECK (
    requested_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_extensions.booking_id AND b.seeker_id = auth.uid()
    )
  );

CREATE POLICY "Provider can update status"
  ON public.booking_extensions FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_extensions.booking_id AND b.provider_id = auth.uid()
  ));

CREATE TRIGGER trg_booking_extensions_updated
  BEFORE UPDATE ON public.booking_extensions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. overdue_charges
CREATE TABLE IF NOT EXISTS public.overdue_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  charge_date date NOT NULL,
  units numeric NOT NULL,
  rate numeric NOT NULL,
  amount numeric NOT NULL,
  payment_intent_id text,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id, charge_date)
);

GRANT SELECT ON public.overdue_charges TO authenticated;
GRANT ALL ON public.overdue_charges TO service_role;
ALTER TABLE public.overdue_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties can view overdue charges"
  ON public.overdue_charges FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = overdue_charges.booking_id
      AND (b.seeker_id = auth.uid() OR b.provider_id = auth.uid())
  ));

-- 4. Indexes for cron lookups
CREATE INDEX IF NOT EXISTS idx_bookings_escrow_release
  ON public.bookings (escrow_status, auto_release_at)
  WHERE escrow_status = 'held';

CREATE INDEX IF NOT EXISTS idx_bookings_overdue
  ON public.bookings (end_date, escrow_status)
  WHERE escrow_status = 'held';
