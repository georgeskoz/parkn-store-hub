-- Add stripe_bank_last4 to profiles so the dashboard can show which bank
-- account is connected. Like stripe_account_id/stripe_onboarding_complete,
-- this is written only by the service-role edge functions (create-stripe-
-- connect-link, stripe-webhook) and is not granted to anon/authenticated --
-- owners read it via get_my_profile(), which already does `SELECT *`.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_bank_last4 TEXT;
