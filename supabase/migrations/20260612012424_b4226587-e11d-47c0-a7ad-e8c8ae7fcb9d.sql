
-- 1) Profiles: stop public exposure of stripe fields
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Public-safe view (excludes stripe_account_id, stripe_onboarding_complete)
-- Runs as view owner so it bypasses base-table RLS for the safe columns only.
CREATE OR REPLACE VIEW public.profiles_public AS
  SELECT id, display_name, avatar_url, bio, phone, created_at
  FROM public.profiles;

GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- 2) user_roles: remove privilege-escalation policies
DROP POLICY IF EXISTS "Users can insert own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can delete own roles" ON public.user_roles;

-- 3) Storage: owner-only UPDATE on listing-photos, and stop file listing
DROP POLICY IF EXISTS "Anyone can view listing photos" ON storage.objects;

CREATE POLICY "Users can update own listing photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'listing-photos' AND (auth.uid())::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'listing-photos' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- 4) Lock down has_role: only authenticated may execute (used in RLS); revoke from anon/public
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
