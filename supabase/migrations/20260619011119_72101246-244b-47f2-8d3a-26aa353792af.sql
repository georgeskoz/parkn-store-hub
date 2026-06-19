
-- Helper: check if the current user owns a given listing (bypasses RLS on listings)
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

-- listing_rental_terms: replace policy with explicit per-command versions using the definer function
DROP POLICY IF EXISTS "Hosts manage own rental terms" ON public.listing_rental_terms;

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

-- Same fix for listing_availability_slots (same EXISTS pattern, same potential failure mode)
DROP POLICY IF EXISTS "Hosts manage own availability slots" ON public.listing_availability_slots;

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
