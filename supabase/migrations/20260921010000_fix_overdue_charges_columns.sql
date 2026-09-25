-- Fixes a schema/code mismatch discovered 2026-09-20: charge-overdue/index.ts
-- has always referenced charge_date, units, rate, payment_intent_id, and
-- error_message on public.overdue_charges, but the production table only
-- ever had id, booking_id, status, amount, created_at. Every insert/update
-- against those missing columns failed silently (the code destructured
-- only `data`, never `error`), so the function's duplicate-charge
-- protection was completely inert while it kept firing real off-session
-- Stripe charges. charge-overdue-hourly was unscheduled as an emergency
-- stopgap while this was investigated; this migration brings the table in
-- line with what the code has always expected, and charge-overdue/index.ts
-- was separately patched to check these errors instead of swallowing them,
-- so this class of bug fails loud (skips the charge) instead of silently
-- disabling its own safety net if it ever happens again.

alter table public.overdue_charges
  add column if not exists charge_date date,
  add column if not exists units integer,
  add column if not exists rate numeric,
  add column if not exists payment_intent_id text,
  add column if not exists error_message text;

-- Belt-and-suspenders: the application code already checks for an
-- existing charge_date before inserting a new row, but a unique index
-- makes it impossible to record two charges for the same booking on the
-- same day even under a race. Existing rows (all NULL charge_date, from
-- before this migration) are unaffected -- Postgres does not enforce
-- uniqueness across NULLs.
create unique index if not exists overdue_charges_booking_day_unique
  on public.overdue_charges (booking_id, charge_date);
