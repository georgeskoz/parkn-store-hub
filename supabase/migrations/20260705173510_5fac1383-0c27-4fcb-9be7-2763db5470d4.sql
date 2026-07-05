DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public
WITH (security_invoker = false) AS
SELECT id, display_name, avatar_url, bio, phone, created_at
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO anon, authenticated;