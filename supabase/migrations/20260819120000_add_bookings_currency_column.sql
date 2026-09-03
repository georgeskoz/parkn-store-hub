-- release-booking-payout hardcoded currency: "cad" on its Stripe transfer,
-- but create-payment-intent (mobile) always charges in "usd" -- confirmed
-- live that bookings has no currency column at all, so there was no way
-- for the transfer to know what was actually charged. Every existing
-- booking was in fact charged in CAD (100% web-originated so far, per
-- tonight's production check), so backfilling the default to 'cad' is a
-- factually correct default, not a guess.
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'cad';
