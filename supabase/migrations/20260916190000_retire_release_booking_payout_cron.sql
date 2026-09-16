-- Retires the 'release-booking-payout-hourly' pg_cron job installed by
-- 20260819100000_schedule_payout_and_overdue_cron.sql. That function used a
-- hardcoded 10% commission (ignoring both the real per-booking
-- commission_rate and the admin-configurable platform_settings.commission_rate)
-- and had no way to know admin's own payout-executor.ts path had already
-- paid a booking, creating a live double-transfer risk. Payouts now go
-- exclusively through admin's payout-executor.ts: manually via the
-- "Trigger Payout" button, and automatically via the new
-- 'admin-payout-release-hourly' job (see the migration that adds it)
-- calling admin/src/app/api/payments/scheduled-release/route.ts.
--
-- Do NOT touch 'charge-overdue-hourly' here -- that job is unrelated and
-- must keep running.
--
-- cron.unschedule() raises an error if the job name doesn't exist, so this
-- guards the call to make the migration safe to run more than once (e.g.
-- if it's ever re-applied against a fresh environment where the job was
-- never scheduled in the first place).
do $$
begin
  if exists (select 1 from cron.job where jobname = 'release-booking-payout-hourly') then
    perform cron.unschedule('release-booking-payout-hourly');
  end if;
end $$;

-- Verify after running: select jobname, schedule, active from cron.job;
-- Expect only 'charge-overdue-hourly' (and, once its own migration has run,
-- 'admin-payout-release-hourly') to remain.
