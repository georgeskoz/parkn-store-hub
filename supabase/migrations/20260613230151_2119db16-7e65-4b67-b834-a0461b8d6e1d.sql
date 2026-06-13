
-- 1) Recreate profiles_public view without SECURITY DEFINER
DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public
WITH (security_invoker = true) AS
SELECT id, display_name, avatar_url, bio, phone, created_at FROM public.profiles;
GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- 2) Tighten bookings INSERT: enforce provider/listing match and lock financial fields to server defaults
DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;

CREATE POLICY "Users can create bookings"
ON public.bookings
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = seeker_id
  AND commission_rate = 10
  AND commission_amount = 0
  AND surge_multiplier = 1
  AND status = 'pending'
  AND refund_amount = 0
  AND EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = bookings.listing_id
      AND l.user_id = bookings.provider_id
      AND l.status = 'approved'
  )
);

-- 3) Storage: enforce folder ownership on INSERT for listing-photos
DROP POLICY IF EXISTS "Authenticated users can upload listing photos" ON storage.objects;

CREATE POLICY "Authenticated users can upload listing photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'listing-photos'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);
