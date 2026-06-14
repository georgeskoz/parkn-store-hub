
-- 1) booking_extensions: restrict provider updates to status + responded_at
DROP POLICY IF EXISTS "Provider can update status" ON public.booking_extensions;

CREATE POLICY "Provider can update status"
ON public.booking_extensions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_extensions.booking_id
      AND b.provider_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_extensions.booking_id
      AND b.provider_id = auth.uid()
  )
  AND status IN ('approved', 'rejected')
  -- Immutable fields: provider must not alter financial / payment / request data
  AND booking_id     = (SELECT be.booking_id     FROM public.booking_extensions be WHERE be.id = booking_extensions.id)
  AND requested_by   = (SELECT be.requested_by   FROM public.booking_extensions be WHERE be.id = booking_extensions.id)
  AND extra_hours    = (SELECT be.extra_hours    FROM public.booking_extensions be WHERE be.id = booking_extensions.id)
  AND extra_units    = (SELECT be.extra_units    FROM public.booking_extensions be WHERE be.id = booking_extensions.id)
  AND extra_amount   = (SELECT be.extra_amount   FROM public.booking_extensions be WHERE be.id = booking_extensions.id)
  AND new_end_date   = (SELECT be.new_end_date   FROM public.booking_extensions be WHERE be.id = booking_extensions.id)
  AND rate           = (SELECT be.rate           FROM public.booking_extensions be WHERE be.id = booking_extensions.id)
  AND paid_at        IS NOT DISTINCT FROM (SELECT be.paid_at            FROM public.booking_extensions be WHERE be.id = booking_extensions.id)
  AND payment_intent_id IS NOT DISTINCT FROM (SELECT be.payment_intent_id FROM public.booking_extensions be WHERE be.id = booking_extensions.id)
  AND stripe_session_id IS NOT DISTINCT FROM (SELECT be.stripe_session_id FROM public.booking_extensions be WHERE be.id = booking_extensions.id)
);

-- 2) bookings: lock down all server-managed financial / payment fields on INSERT
DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;

CREATE POLICY "Users can create bookings"
ON public.bookings
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = seeker_id
  AND commission_rate    = 10
  AND commission_amount  = 0
  AND surge_multiplier   = 1
  AND refund_amount      = 0
  AND overdue_charges_total = 0
  AND status             = 'pending'
  AND escrow_status      = 'pending'
  AND payout_amount              IS NULL
  AND payment_intent_id          IS NULL
  AND stripe_session_id          IS NULL
  AND stripe_customer_id         IS NULL
  AND stripe_payment_method_id   IS NULL
  AND stripe_refund_id           IS NULL
  AND released_at                IS NULL
  AND released_transfer_id       IS NULL
  AND cancelled_at               IS NULL
  AND cancellation_reason        IS NULL
  AND refund_status              IS NULL
  AND dispute_opened_at          IS NULL
  AND dispute_reason             IS NULL
  AND completed_by_seeker_at     IS NULL
  AND completed_by_provider_at   IS NULL
  AND last_overdue_charge_at     IS NULL
  AND EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = bookings.listing_id
      AND l.user_id = bookings.provider_id
      AND l.status = 'approved'
  )
);

-- 3) Storage: scope listing-photos DELETE to authenticated role only
DROP POLICY IF EXISTS "Users can delete own listing photos" ON storage.objects;

CREATE POLICY "Users can delete own listing photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'listing-photos'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);
