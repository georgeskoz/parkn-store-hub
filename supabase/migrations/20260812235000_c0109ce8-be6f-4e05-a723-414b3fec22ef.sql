-- Fix: hosts blocked from creating new listings by
-- "new row violates row-level security policy for table listing_availability_slots"
-- (and the same failure on listing_rental_terms).
--
-- Root cause: migration 20260619011119_72101246-244b-47f2-8d3a-26aa353792af.sql
-- (which replaced the original broken "Hosts manage own slots"/"Hosts manage own
-- rental terms" FOR ALL policies with correct per-command policies built on the
-- SECURITY DEFINER helper public.user_owns_listing()) was never applied against
-- the production database -- confirmed live: inserting into listing_blocked_dates
-- (which got its correct user_owns_listing()-based INSERT policy directly in its
-- original migration, 20260623224848) succeeds for a host's own listing, while the
-- identical insert against listing_availability_slots / listing_rental_terms fails
-- with 42501, for both pending AND already-approved listings owned by that same
-- host. That behavior is only explained by the fixed policies being entirely
-- absent on this table in production, not by any listing-ownership or
-- approval-status edge case.
--
-- This migration re-applies that fix idempotently so it's safe to run regardless
-- of whatever partial state production is actually in.

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
