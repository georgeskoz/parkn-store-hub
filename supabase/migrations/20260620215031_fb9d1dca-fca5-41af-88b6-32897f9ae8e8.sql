CREATE OR REPLACE FUNCTION public.user_owns_listing(_listing_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.listings
    WHERE id = _listing_id
      AND _user_id IS NOT NULL
      AND (user_id = _user_id OR host_id = _user_id)
  )
$$;

GRANT EXECUTE ON FUNCTION public.user_owns_listing(uuid, uuid) TO authenticated, service_role;