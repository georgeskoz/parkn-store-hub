-- These columns were designed and written up in an earlier migration
-- (20260614003038) and referenced throughout the app's code (edge functions:
-- cancel-booking, complete-rental, charge-overdue, open-dispute,
-- release-booking-payout, stripe-webhook; frontend: SeekerBookingsList,
-- ProviderActiveBookings, useReviewableBookings) as if they existed -- but a
-- live schema check confirmed they were never actually applied to
-- production. refund_amount/cancelled_at/refund_status/overdue_charges'/
-- last_overdue_charge_at (added in the same batch of work) DO exist, so
-- only what's genuinely missing is re-added here, idempotently.
--
-- Net effect once applied: the five edge functions above start working
-- instead of hard-failing on every call, and the Seeker/Provider dashboards
-- stop silently showing an empty booking list (their .select() calls
-- include these columns explicitly and have been failing outright).
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS stripe_refund_id text,
  ADD COLUMN IF NOT EXISTS completed_by_provider_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_by_seeker_at timestamptz,
  ADD COLUMN IF NOT EXISTS dispute_opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS dispute_reason text,
  ADD COLUMN IF NOT EXISTS overdue_charges_total numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS released_at timestamptz,
  ADD COLUMN IF NOT EXISTS released_transfer_id text;
