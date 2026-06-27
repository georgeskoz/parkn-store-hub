
-- Disputes table for booking dispute flow
CREATE TYPE public.dispute_status AS ENUM ('open','under_review','resolved_seeker','resolved_host','closed');
CREATE TYPE public.dispute_reason AS ENUM ('item_not_as_described','no_show','property_damage','unauthorized_charge','safety_concern','other');

CREATE TABLE public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  raised_by uuid NOT NULL,
  reason public.dispute_reason NOT NULL,
  description text NOT NULL,
  evidence_urls text[] NOT NULL DEFAULT '{}',
  status public.dispute_status NOT NULL DEFAULT 'open',
  admin_notes text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(booking_id)
);

GRANT SELECT, INSERT ON public.disputes TO authenticated;
GRANT ALL ON public.disputes TO service_role;

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- Insert: only the seeker or provider on the booking, and raised_by must be them
CREATE POLICY "Party can raise dispute"
ON public.disputes FOR INSERT TO authenticated
WITH CHECK (
  raised_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_id
      AND (b.seeker_id = auth.uid() OR b.provider_id = auth.uid())
  )
);

-- Select: parties to the booking can view
CREATE POLICY "Parties can view dispute"
ON public.disputes FOR SELECT TO authenticated
USING (
  raised_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_id
      AND (b.seeker_id = auth.uid() OR b.provider_id = auth.uid())
  )
);

-- Admin update
CREATE POLICY "Admins manage disputes"
ON public.disputes FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_disputes_updated_at BEFORE UPDATE ON public.disputes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_disputes_booking ON public.disputes(booking_id);
CREATE INDEX idx_disputes_raised_by ON public.disputes(raised_by);
