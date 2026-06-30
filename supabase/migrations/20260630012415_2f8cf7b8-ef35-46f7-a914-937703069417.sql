
-- 1) bookings: revoke broad SELECT, regrant only non-sensitive columns to authenticated.
REVOKE SELECT ON public.bookings FROM authenticated;
GRANT SELECT (
  id, listing_id, seeker_id, provider_id, start_date, end_date,
  total_amount, commission_amount, commission_rate, status, city, category,
  created_at, updated_at, original_amount, surge_multiplier, refund_amount,
  cancelled_at, refund_status, cancellation_reason, escrow_status,
  auto_release_at, released_at, overdue_charges_total, last_overdue_charge_at,
  completed_by_provider_at, completed_by_seeker_at, dispute_opened_at, dispute_reason
) ON public.bookings TO authenticated;

-- 2) booking_extensions: hide stripe identifiers from authenticated.
REVOKE SELECT ON public.booking_extensions FROM authenticated;
GRANT SELECT (
  id, booking_id, requested_by, status, new_end_date,
  extra_amount, extra_units, extra_hours, rate,
  paid_at, responded_at, created_at, updated_at
) ON public.booking_extensions TO authenticated;

-- 3) overdue_charges: hide payment_intent_id from authenticated.
REVOKE SELECT ON public.overdue_charges FROM authenticated;
GRANT SELECT (
  id, booking_id, charge_date, units, rate, amount, status, error_message, created_at
) ON public.overdue_charges TO authenticated;

-- 4) Admin-only function returning full bookings (incl. stripe fields).
CREATE OR REPLACE FUNCTION public.admin_list_bookings()
RETURNS SETOF public.bookings
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden: admin only';
  END IF;
  RETURN QUERY SELECT * FROM public.bookings ORDER BY created_at DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_list_bookings() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_list_bookings() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_list_bookings() TO authenticated;

-- 5) storage.objects: restrict SELECT (listing) on listing-photos to the file owner's folder.
DROP POLICY IF EXISTS "Users can view own listing photos" ON storage.objects;
CREATE POLICY "Users can view own listing photos"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'listing-photos'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );
