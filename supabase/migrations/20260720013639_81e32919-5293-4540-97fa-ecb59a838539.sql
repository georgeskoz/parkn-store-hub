
-- Fix 1: Restore public readability of safe profile fields via profiles_public view.
-- Recreate as security_definer (default) so the view bypasses RLS on the base
-- profiles table and exposes only the safe columns to anon/authenticated.
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public AS
SELECT id, display_name, avatar_url, bio, phone, created_at
FROM public.profiles;

ALTER VIEW public.profiles_public OWNER TO postgres;

GRANT SELECT ON public.profiles_public TO anon, authenticated;
