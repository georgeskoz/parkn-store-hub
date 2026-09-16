-- Schedules charge-installments to run hourly via the same pg_cron + pg_net
-- + Vault pattern as charge-overdue-hourly and admin-payout-release-hourly
-- (see 20260819100000_schedule_payout_and_overdue_cron.sql and
-- 20260916190100_schedule_admin_payout_release_cron.sql). Reuses the
-- existing 'service_role_key' Vault secret -- no new secret needed.
--
-- pg_cron/pg_net extensions are already created by
-- 20260819100000_schedule_payout_and_overdue_cron.sql; `create extension if
-- not exists` here is just defensive in case migrations are ever replayed
-- out of order against a fresh environment.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'charge-installments-hourly',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://lnjvltwcixacartboxuc.supabase.co/functions/v1/charge-installments',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- Verify after running:
--   select jobname, schedule, active from cron.job;
-- Expect charge-overdue-hourly, admin-payout-release-hourly (once its own
-- migration has run), and charge-installments-hourly all present alongside
-- each other.
