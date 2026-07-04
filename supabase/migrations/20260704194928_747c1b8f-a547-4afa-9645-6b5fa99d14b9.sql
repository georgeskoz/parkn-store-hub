
CREATE TABLE public.user_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  terms_version timestamptz,
  privacy_version timestamptz,
  user_agent text,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX user_agreements_user_id_idx ON public.user_agreements(user_id);
GRANT SELECT, INSERT ON public.user_agreements TO authenticated;
GRANT ALL ON public.user_agreements TO service_role;
ALTER TABLE public.user_agreements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own agreements" ON public.user_agreements FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users insert own agreements" ON public.user_agreements FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all agreements" ON public.user_agreements FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
