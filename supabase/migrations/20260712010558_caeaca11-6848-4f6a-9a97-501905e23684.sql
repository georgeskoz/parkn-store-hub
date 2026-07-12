
-- 1. Fix SUPA_security_definer_view: recreate profiles_public as SECURITY INVOKER
DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public
WITH (security_invoker = true) AS
SELECT id, display_name, avatar_url, bio, phone, created_at
FROM public.profiles;
GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- Add SELECT policy allowing everyone to read profiles rows (column privileges below
-- restrict which columns anon/authenticated can actually read, keeping stripe fields private).
DROP POLICY IF EXISTS "Public safe profile fields readable" ON public.profiles;
CREATE POLICY "Public safe profile fields readable"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (true);

-- Restrict column privileges so stripe_account_id/stripe_onboarding_complete cannot be read
-- directly by anon/authenticated. Owners access them via get_my_profile() below.
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, display_name, avatar_url, bio, phone, created_at, updated_at, postal_code)
  ON public.profiles TO authenticated;
GRANT SELECT (id, display_name, avatar_url, bio, phone, created_at)
  ON public.profiles TO anon;

-- Owner-only accessor that returns the full profile row including stripe fields.
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.profiles WHERE id = auth.uid()
$$;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- 2. Fix listing_child_tables_public_over_expose: restrict SELECT to approved listings or owner/admin
DROP POLICY IF EXISTS "Anyone can view availability slots" ON public.listing_availability_slots;
DROP POLICY IF EXISTS "Anyone can view rental terms" ON public.listing_rental_terms;
DROP POLICY IF EXISTS "Anyone can view blocked dates" ON public.listing_blocked_dates;

CREATE POLICY "View slots for approved or owned listings"
ON public.listing_availability_slots
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = listing_availability_slots.listing_id
      AND (
        l.is_approved = true
        OR public.user_owns_listing(l.id, auth.uid())
        OR public.has_role(auth.uid(), 'admin'::app_role)
      )
  )
);

CREATE POLICY "View rental terms for approved or owned listings"
ON public.listing_rental_terms
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = listing_rental_terms.listing_id
      AND (
        l.is_approved = true
        OR public.user_owns_listing(l.id, auth.uid())
        OR public.has_role(auth.uid(), 'admin'::app_role)
      )
  )
);

CREATE POLICY "View blocked dates for approved or owned listings"
ON public.listing_blocked_dates
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = listing_blocked_dates.listing_id
      AND (
        l.is_approved = true
        OR public.user_owns_listing(l.id, auth.uid())
        OR public.has_role(auth.uid(), 'admin'::app_role)
      )
  )
);

-- 3. Fix availability_slots_duplicate_policy_host_id_gap: drop the duplicate ALL policy
-- that only checked user_id, leaving the user_owns_listing-based per-command policies intact.
DROP POLICY IF EXISTS "Hosts manage own slots" ON public.listing_availability_slots;

-- 4. Fix SUPA_rls_policy_always_true: replace the "Anyone can submit a ticket" INSERT policy
-- that had WITH CHECK (true) with a validated check.
DROP POLICY IF EXISTS "Anyone can submit a ticket" ON public.support_tickets;
CREATE POLICY "Anyone can submit a ticket"
ON public.support_tickets
FOR INSERT
WITH CHECK (
  char_length(name) BETWEEN 1 AND 200
  AND char_length(email) BETWEEN 3 AND 320
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND char_length(subject) BETWEEN 1 AND 300
  AND char_length(message) BETWEEN 1 AND 5000
  AND status = 'open'
);
