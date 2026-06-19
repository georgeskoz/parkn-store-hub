
-- 1) Remove broad public SELECT on storage.objects for listing-photos bucket.
-- Public bucket files remain accessible via the public object URL endpoint,
-- but anonymous listing of bucket contents is no longer allowed.
DROP POLICY IF EXISTS "Public can view listing photos" ON storage.objects;

-- 2) Stop publishing bookings to Realtime so sensitive financial columns
-- (stripe_*, payout_amount, etc.) cannot leak via change broadcasts.
ALTER PUBLICATION supabase_realtime DROP TABLE public.bookings;
