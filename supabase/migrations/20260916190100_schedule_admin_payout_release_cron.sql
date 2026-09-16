-- Adds the automatic trigger the admin panel's payout logic never had
-- (admin/src/app/api/payments/auto-payout/route.ts had zero callers
-- anywhere -- confirmed by grep -- so today System B only fires manually,
-- via the "Trigger Payout" button). This is the replacement for the
-- retired 'release-booking-payout-hourly' job: same hourly cadence, but
-- pointed at admin's own payout-executor.ts logic (with the fixed
-- commission/tax math and escrow-state guard) via a new secret-gated route,
-- admin/src/app/api/payments/scheduled-release/route.ts.
--
-- STATUS: already run against production directly in the Supabase SQL
-- Editor on 2026-09-16. The 'payout_cron_secret' Vault secret has already
-- been seeded and this job is already scheduled and active (verified via
-- `select jobname, schedule, active from cron.job;`). This file is kept so
-- the migration history matches what's live -- do not re-run cron.schedule
-- for this job name unless it needs to be changed (cron.schedule upserts by
-- jobname, so re-running with a different URL/secret would just update it
-- in place, which is fine, but running it unchanged is a harmless no-op).
--
-- STILL OUTSTANDING (not something I can do from here): set
-- PAYOUT_CRON_SECRET on the admin Next.js app's Vercel project
-- (Settings -> Environment Variables) to the exact value that was seeded
-- into Vault as 'payout_cron_secret', then redeploy admin. Until that's
-- done, this job fires hourly but every call gets a 403 from
-- /api/payments/scheduled-release (the route exists and is gated correctly
-- -- it just doesn't have the secret to compare against yet) -- so no
-- payouts move until the Vercel env var is set, not a silent failure.
select cron.schedule(
  'admin-payout-release-hourly',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://admin.spotsvault.com/api/payments/scheduled-release',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'payout_cron_secret')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- Verify after running: select jobname, schedule, active from cron.job;
-- Expect 'charge-overdue-hourly' and 'admin-payout-release-hourly' --
-- 'release-booking-payout-hourly' should already be gone (previous migration).
