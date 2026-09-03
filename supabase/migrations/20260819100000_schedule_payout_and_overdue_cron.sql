-- Schedules release-booking-payout and charge-overdue to run hourly via
-- pg_cron + pg_net. Both functions were previously deployed but never
-- triggered by anything (confirmed live: pg_cron/pg_net were not even
-- installed on this project) -- this closes that gap.
--
-- The service-role key is intentionally NOT in this file. It's read at
-- call time from Supabase Vault (vault.decrypted_secrets), under the name
-- 'service_role_key'. That secret must be seeded once, manually, via the
-- SQL Editor (never committed to the repo):
--
--   select vault.create_secret(
--     '<real service role key>',
--     'service_role_key',
--     'Service role key used by pg_cron jobs to call release-booking-payout and charge-overdue'
--   );
--
-- This migration will fail (or the jobs will fail at runtime with a null
-- Authorization header) if that secret hasn't been created first.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'release-booking-payout-hourly',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://lnjvltwcixacartboxuc.supabase.co/functions/v1/release-booking-payout',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

select cron.schedule(
  'charge-overdue-hourly',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://lnjvltwcixacartboxuc.supabase.co/functions/v1/charge-overdue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
