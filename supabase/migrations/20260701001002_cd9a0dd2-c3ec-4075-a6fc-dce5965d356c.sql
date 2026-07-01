
-- Restore missing GRANTs so anon/authenticated can reach public-read tables
-- (RLS policies already gate row visibility). Without these, PostgREST returns 401.

GRANT SELECT ON public.listings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listings TO authenticated;
GRANT ALL ON public.listings TO service_role;

GRANT SELECT ON public.listing_availability_slots TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_availability_slots TO authenticated;
GRANT ALL ON public.listing_availability_slots TO service_role;

GRANT SELECT ON public.listing_blocked_dates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_blocked_dates TO authenticated;
GRANT ALL ON public.listing_blocked_dates TO service_role;

GRANT SELECT ON public.listing_rental_terms TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_rental_terms TO authenticated;
GRANT ALL ON public.listing_rental_terms TO service_role;

GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
