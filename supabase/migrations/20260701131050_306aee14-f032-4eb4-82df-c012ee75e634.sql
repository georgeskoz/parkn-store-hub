
-- 1) bookings: allow seeker/provider to update ONLY their completion timestamps
CREATE POLICY "Seekers and providers can update own booking completion"
ON public.bookings
FOR UPDATE
TO authenticated
USING (auth.uid() = seeker_id OR auth.uid() = provider_id)
WITH CHECK (auth.uid() = seeker_id OR auth.uid() = provider_id);

-- Trigger to block changes to sensitive fields by non-admins
CREATE OR REPLACE FUNCTION public.bookings_restrict_user_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins and service role bypass
  IF public.has_role(auth.uid(), 'admin'::app_role) OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only allow seeker to set completed_by_seeker_at, provider to set completed_by_provider_at
  IF auth.uid() = OLD.seeker_id THEN
    IF NEW.completed_by_provider_at IS DISTINCT FROM OLD.completed_by_provider_at THEN
      RAISE EXCEPTION 'Not allowed to change completed_by_provider_at';
    END IF;
  ELSIF auth.uid() = OLD.provider_id THEN
    IF NEW.completed_by_seeker_at IS DISTINCT FROM OLD.completed_by_seeker_at THEN
      RAISE EXCEPTION 'Not allowed to change completed_by_seeker_at';
    END IF;
  ELSE
    RAISE EXCEPTION 'Not allowed to update this booking';
  END IF;

  -- Lock all other columns to their old values
  NEW.seeker_id := OLD.seeker_id;
  NEW.provider_id := OLD.provider_id;
  NEW.listing_id := OLD.listing_id;
  NEW.status := OLD.status;
  NEW.escrow_status := OLD.escrow_status;
  NEW.total_price := OLD.total_price;
  NEW.commission_rate := OLD.commission_rate;
  NEW.commission_amount := OLD.commission_amount;
  NEW.payout_amount := OLD.payout_amount;
  NEW.refund_amount := OLD.refund_amount;
  NEW.refund_status := OLD.refund_status;
  NEW.surge_multiplier := OLD.surge_multiplier;
  NEW.overdue_charges_total := OLD.overdue_charges_total;
  NEW.last_overdue_charge_at := OLD.last_overdue_charge_at;
  NEW.payment_intent_id := OLD.payment_intent_id;
  NEW.stripe_session_id := OLD.stripe_session_id;
  NEW.stripe_customer_id := OLD.stripe_customer_id;
  NEW.stripe_payment_method_id := OLD.stripe_payment_method_id;
  NEW.stripe_refund_id := OLD.stripe_refund_id;
  NEW.released_at := OLD.released_at;
  NEW.released_transfer_id := OLD.released_transfer_id;
  NEW.cancelled_at := OLD.cancelled_at;
  NEW.cancellation_reason := OLD.cancellation_reason;
  NEW.dispute_opened_at := OLD.dispute_opened_at;
  NEW.dispute_reason := OLD.dispute_reason;
  NEW.start_date := OLD.start_date;
  NEW.end_date := OLD.end_date;
  NEW.created_at := OLD.created_at;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_restrict_user_updates_trg ON public.bookings;
CREATE TRIGGER bookings_restrict_user_updates_trg
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.bookings_restrict_user_updates();

-- 2) listings: hide address/unit/postal_code from anonymous users
REVOKE SELECT ON public.listings FROM anon;
GRANT SELECT (
  id, user_id, host_id, category, type, title, description,
  city, province, country, region, lat, lng,
  features, availability, spots, size, sqft, size_sqft,
  hourly, daily, weekly, monthly,
  price_hourly, price_daily, price_weekly, price_monthly,
  seasonal, cancellation, student_discount, student_discount_percent,
  student_universities, nearby_landmarks, nearby_venues, photos,
  disclaimer_accepted, created_at, updated_at, status,
  instant_book, is_active, is_approved, amenities, avg_rating,
  event_pricing_enabled, event_pricing, ai_moderation
) ON public.listings TO anon;

-- 3) storage: allow public SELECT on listing-photos bucket rows
DROP POLICY IF EXISTS "Public can view listing photos" ON storage.objects;
CREATE POLICY "Public can view listing photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'listing-photos');
