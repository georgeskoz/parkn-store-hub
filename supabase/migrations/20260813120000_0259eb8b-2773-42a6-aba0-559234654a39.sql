-- Security Advisor fixes: RLS not enabled on public.listings, and
-- public.profiles_public flagged as a Security Definer View.
--
-- Both are the same pattern as every fix today: the correct migration
-- already exists earlier in this repo's history but was never applied to
-- the real production database. Confirmed live and directly, same
-- standard as everything else today:
--
--   * Queried a known PENDING/unapproved listing (is_approved=false) using
--     nothing but the public anon key -- got back its full row (photos,
--     exact lat/lng, description, owner id). The SELECT policy that should
--     restrict this to "approved OR owner OR admin" exists in the repo
--     (20260613202143) but clearly isn't being enforced -- meaning RLS
--     itself isn't actually enabled on the table, despite the policy
--     existing (exactly what the advisor flagged).
--
--   * While checking profiles_public, went further and queried the base
--     public.profiles table directly as anon: `select=*` returned every
--     column for any user, unfiltered and enumerable -- full name, phone,
--     complete home address (address_line1/2, city, province, postal_code,
--     country), stripe_customer_id, stripe_account_id,
--     stripe_onboarding_complete, id_verified, payout_schedule. This is
--     the same underlying issue as the flagged profiles_public view (both
--     ultimately trace back to public.profiles never having gotten the
--     restrictive policy + column-privilege fix from 20260712010558
--     applied), and is very likely the unnamed 4th advisor error -- it's
--     strictly worse than the view-level finding since it exposes PII and
--     Stripe linkage for every user with zero authentication required.
--
-- Re-applies the already-written, already-correct fixes idempotently so
-- this is safe to run regardless of whatever partial state production is
-- actually in.

-- ============================================================
-- 1. public.listings: RLS not enabled despite correct policies existing
-- ============================================================

-- public.has_role() doesn't exist on production either (checked via RPC:
-- PGRST202 "not found in schema cache", same failure mode as
-- user_owns_listing before today's earlier fix) -- the "Public can view
-- approved listings" policy below calls it, and shipping that policy
-- without this function existing would break every listings query with a
-- function-not-found error instead of fixing the security hole.
--
-- Correction from the first version of this migration: it declared
-- _role as the app_role enum type (matching the repo's own original
-- definition), but running it against production surfaced "type
-- app_role does not exist" (42704) -- so unlike the enum VALUE 'admin'
-- (confirmed usable via a filter query beforehand), the TYPE ITSELF
-- isn't named app_role on production, or user_roles.role isn't that
-- enum type at all. Rather than guess at the real type name, this
-- version takes _role as text and casts the column to text for
-- comparison, which works regardless of whether the underlying column
-- is plain text or any enum type (every type has a default cast to
-- text) -- no longer assuming anything about a type name I can't verify.
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role text)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text = _role
  )
$$;
-- Matches the widest grant found in the repo's own history
-- (20260701001110): RLS policies need to call this for every querying
-- role, anon included (it just correctly evaluates false for them).
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO anon, authenticated, service_role;

ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- Defensively drop the original overly-permissive policy in case it's
-- still present on production alongside (or instead of) the restrictive
-- one -- permissive RLS policies are OR'd together, so if this one still
-- existed it would silently defeat the restrictive policy below even with
-- RLS enabled.
DROP POLICY IF EXISTS "Anyone can view listings" ON public.listings;

DROP POLICY IF EXISTS "Public can view approved listings" ON public.listings;
CREATE POLICY "Public can view approved listings"
  ON public.listings FOR SELECT
  USING (status = 'approved' OR auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can create their own listings" ON public.listings;
CREATE POLICY "Users can create their own listings"
ON public.listings FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own listings" ON public.listings;
CREATE POLICY "Users can update their own listings"
ON public.listings FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own listings" ON public.listings;
CREATE POLICY "Users can delete their own listings"
ON public.listings FOR DELETE
USING (auth.uid() = user_id);

-- ============================================================
-- 2. public.profiles_public Security Definer View + underlying
--    public.profiles full-column, fully-enumerable exposure
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public
WITH (security_invoker = true) AS
SELECT id, display_name, avatar_url, bio, phone, created_at
FROM public.profiles;
GRANT SELECT ON public.profiles_public TO anon, authenticated;

DROP POLICY IF EXISTS "Public safe profile fields readable" ON public.profiles;
CREATE POLICY "Public safe profile fields readable"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (true);

-- Column-level privileges are what actually keep stripe_account_id,
-- stripe_onboarding_complete, home address fields, etc. private -- the
-- USING(true) policy above only controls row visibility, not columns.
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, display_name, avatar_url, bio, phone, created_at, updated_at, postal_code)
  ON public.profiles TO authenticated;
GRANT SELECT (id, display_name, avatar_url, bio, phone, created_at)
  ON public.profiles TO anon;

-- Owner-only accessor for the full profile row (stripe fields, address,
-- etc.) -- SECURITY DEFINER is correct and intentional here since it's
-- gated by `WHERE id = auth.uid()` inside the function body, not by the
-- caller's column privileges.
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
