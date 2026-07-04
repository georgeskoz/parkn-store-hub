
-- 1. bookings — restrict non-admin UPDATE to two columns only.
REVOKE UPDATE ON public.bookings FROM authenticated;
REVOKE UPDATE ON public.bookings FROM anon;
GRANT UPDATE (completed_by_seeker_at, completed_by_provider_at)
  ON public.bookings TO authenticated;
-- service_role retains full ALL grant from earlier migrations.

-- 2. overdue_charges — explicit no-write for non-admin/non-service roles.
REVOKE INSERT, UPDATE, DELETE ON public.overdue_charges FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.overdue_charges FROM anon;

DROP POLICY IF EXISTS "Admins manage overdue charges" ON public.overdue_charges;
CREATE POLICY "Admins manage overdue charges"
  ON public.overdue_charges FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. platform_settings — scope public read to a small allow-list of keys.
DROP POLICY IF EXISTS "Anyone can read platform settings" ON public.platform_settings;

CREATE POLICY "Public can read whitelisted settings"
  ON public.platform_settings FOR SELECT
  USING (key IN ('maintenance_mode', 'announcement'));

CREATE POLICY "Admins can read all settings"
  ON public.platform_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 4. listing-photos — drop the broad SELECT policy that allows bucket enumeration.
--    Files remain reachable via their public URLs (public bucket serves objects
--    directly without touching RLS). Owner-scoped SELECT policy remains for API list.
DROP POLICY IF EXISTS "Public can view listing photos" ON storage.objects;
