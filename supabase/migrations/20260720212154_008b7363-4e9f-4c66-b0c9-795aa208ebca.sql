
-- Recreate profiles_public as a SECURITY INVOKER view (no more SECURITY DEFINER)
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public
WITH (security_invoker = true) AS
SELECT id, display_name, avatar_url, bio, phone, created_at
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- Ensure a permissive public SELECT policy exists on profiles so the invoker view returns rows.
-- Column-level grants below constrain which columns anon/authenticated can actually read.
DROP POLICY IF EXISTS "Public safe profile fields readable" ON public.profiles;
CREATE POLICY "Public safe profile fields readable"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (true);

-- Lock down table-level SELECT and re-grant only the safe columns publicly.
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, display_name, avatar_url, bio, phone, created_at)
  ON public.profiles TO anon, authenticated;

-- Owners still read their full profile (including Stripe fields) via the SECURITY DEFINER
-- function public.get_my_profile(), which already exists.
