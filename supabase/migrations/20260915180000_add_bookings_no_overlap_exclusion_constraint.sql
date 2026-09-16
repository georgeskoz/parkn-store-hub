-- Closes a real double-booking hole, confirmed by reading the actual booking
-- code on both surfaces (not a hypothetical):
--
-- 1. Web's create-booking-payment (the only server-side guard that exists
--    today) does SELECT-for-overlap, then INSERT, as two separate calls.
--    Two nearly-simultaneous checkouts for the same listing/time range can
--    both run the SELECT before either INSERT lands, so both pass and both
--    get a 'pending' booking + a real Stripe Checkout session. Classic
--    check-then-act race condition -- narrow, but real, and gets more likely
--    the more traffic the site gets, which is the whole point of the
--    marketing push.
--
-- 2. Mobile's booking flow (src/app/(tabs)/booking/[id].tsx) is worse: it
--    INSERTs directly into `bookings` from the client SDK with NO overlap
--    check at all, before it ever calls any payment function. RLS only
--    checks `auth.uid() = renter_id` (ownership), not overlap. Two users can
--    each successfully insert a 'pending' row for the exact same
--    listing_id + overlapping start_date/end_date, no conflict raised by
--    either insert.
--
-- An EXCLUDE constraint is the only fix that actually closes both paths at
-- once, because every insert -- server-side or straight from a client SDK --
-- has to go through Postgres. No amount of application-level "check first"
-- code (on either surface) can be made airtight; the database enforcing it
-- can.
--
-- ⚠️ BEFORE RUNNING THIS: existing overlapping rows will make this ALTER
-- TABLE fail outright. Run this check first (in the Supabase SQL Editor) and
-- resolve any rows it returns (cancel/refund the duplicate, or decide which
-- one wins) before applying the constraint below:
--
--   SELECT b1.id AS booking_1, b2.id AS booking_2, b1.listing_id,
--          b1.start_date, b1.end_date, b2.start_date, b2.end_date
--   FROM public.bookings b1
--   JOIN public.bookings b2
--     ON b1.listing_id = b2.listing_id
--    AND b1.id < b2.id
--    AND b1.status <> 'cancelled' AND b2.status <> 'cancelled'
--    AND b1.escrow_status IN ('pending','held','released','completed')
--    AND b2.escrow_status IN ('pending','held','released','completed')
--    AND b1.start_date < b2.end_date
--    AND b1.end_date   > b2.start_date;
--
-- If that returns zero rows, it's safe to run everything below as-is.

-- Required for GiST exclusion constraints over a plain equality column
-- (listing_id) combined with a range type (tstzrange) in the same index.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (
    listing_id WITH =,
    tstzrange(start_date, end_date, '[)') WITH &&
  )
  WHERE (
    status <> 'cancelled'
    AND escrow_status IN ('pending', 'held', 'released', 'completed')
  );

-- Both escrow_status and status are NOT NULL with a DEFAULT of 'pending'
-- (confirmed against the original CREATE TABLE and the later
-- escrow_status-adding migration), so this WHERE clause reliably covers
-- every insert on both surfaces -- mobile's raw client insert never sets
-- escrow_status explicitly, but the column default ('pending') applies
-- automatically and is already in the IN (...) list above.
--
-- A conflicting insert/update now fails with Postgres error code 23P01
-- (exclusion_violation) instead of silently succeeding. Both
-- create-booking-payment/index.ts and the mobile booking screen have been
-- updated to catch that code and show the same friendly message
-- ("This time slot was just booked by someone else...") instead of a raw
-- database error.
