-- Fix: hosts blocked from creating new listings by
-- "new row violates row-level security policy for table listing_availability_slots"
-- (and the same failure on listing_rental_terms).
--
-- Root cause: migration 20260619011119_72101246-244b-47f2-8d3a-26aa353792af.sql
-- (which replaced the original broken "Hosts manage own slots"/"Hosts manage own
-- rental terms" FOR ALL policies with correct per-command policies built on the
-- SECURITY DEFINER helper public.user_owns_listing()) was never applied against
-- the production database -- confirmed live: inserting into listing_blocked_dates
-- succeeds for a host's own listing, while the identical insert against
-- listing_availability_slots / listing_rental_terms fails with 42501, for both
-- pending AND already-approved listings owned by that same host. That rules out
-- any listing-ownership or approval-status edge case.
--
-- Correction from the first version of this migration: running it against
-- production surfaced "function public.user_owns_listing(uuid, uuid) does not
-- exist" (42883) -- so the function itself was also never applied, not just the
-- two tables' policies. listing_blocked_dates' working policy must reach the same
-- result some other way (a direct inline EXISTS, most likely), not via this
-- function as originally assumed from the repo's migration file for that table --
-- production's actual policy text there was never directly confirmed, only
-- inferred. This version creates the function itself first so it's no longer
-- assuming anything about what already exists in production.

CREATE OR REPLACE FUNCTION public.user_owns_listing(_listing_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.listings
    WHERE id = _listing_id AND user_id = _user_id
  )
$$;

DROP POLICY IF EXISTS "Hosts manage own slots" ON public.listing_availability_slots;
DROP POLICY IF EXISTS "Hosts manage own availability slots" ON public.listing_availability_slots;
DROP POLICY IF EXISTS "Hosts insert own availability slots" ON public.listing_availability_slots;
DROP POLICY IF EXISTS "Hosts update own availability slots" ON public.listing_availability_slots;
DROP POLICY IF EXISTS "Hosts delete own availability slots" ON public.listing_availability_slots;

CREATE POLICY "Hosts insert own availability slots"
ON public.listing_availability_slots FOR INSERT TO authenticated
WITH CHECK (public.user_owns_listing(listing_id, auth.uid()));

CREATE POLICY "Hosts update own availability slots"
ON public.listing_availability_slots FOR UPDATE TO authenticated
USING (public.user_owns_listing(listing_id, auth.uid()))
WITH CHECK (public.user_owns_listing(listing_id, auth.uid()));

CREATE POLICY "Hosts delete own availability slots"
ON public.listing_availability_slots FOR DELETE TO authenticated
USING (public.user_owns_listing(listing_id, auth.uid()));

DROP POLICY IF EXISTS "Hosts manage own rental terms" ON public.listing_rental_terms;
DROP POLICY IF EXISTS "Hosts insert own rental terms" ON public.listing_rental_terms;
DROP POLICY IF EXISTS "Hosts update own rental terms" ON public.listing_rental_terms;
DROP POLICY IF EXISTS "Hosts delete own rental terms" ON public.listing_rental_terms;

CREATE POLICY "Hosts insert own rental terms"
ON public.listing_rental_terms FOR INSERT TO authenticated
WITH CHECK (public.user_owns_listing(listing_id, auth.uid()));

CREATE POLICY "Hosts update own rental terms"
ON public.listing_rental_terms FOR UPDATE TO authenticated
USING (public.user_owns_listing(listing_id, auth.uid()))
WITH CHECK (public.user_owns_listing(listing_id, auth.uid()));

CREATE POLICY "Hosts delete own rental terms"
ON public.listing_rental_terms FOR DELETE TO authenticated
USING (public.user_owns_listing(listing_id, auth.uid()));
