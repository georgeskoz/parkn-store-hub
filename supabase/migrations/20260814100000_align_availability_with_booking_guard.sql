-- get_daily_availability only counted escrow_status IN ('held','completed') as
-- "booked", while create-booking-payment's actual double-booking guard blocks
-- ('pending','held','released','completed'). That mismatch meant a date could
-- show as open on the calendar while still being rejected at checkout, because
-- a pending-but-unpaid hold was invisible to the calendar. Now that pending
-- holds actually expire (checkout.session.expired handler + shortened Stripe
-- Checkout window), it's safe to also treat 'pending' as busy here -- the
-- calendar and the real guard now agree on what "unavailable" means.
CREATE OR REPLACE FUNCTION public.get_daily_availability(
  target_listing_id uuid,
  range_start date,
  range_end date
)
RETURNS TABLE (day date, status text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_days constant int := 400;
BEGIN
  IF range_end <= range_start THEN RETURN; END IF;
  IF (range_end - range_start) > max_days THEN
    range_end := range_start + max_days;
  END IF;

  RETURN QUERY
  WITH days AS (
    SELECT generate_series(range_start, range_end - 1, interval '1 day')::date AS d
  ),
  busy AS (
    SELECT
      GREATEST(b.start_date, (d::timestamp AT TIME ZONE 'UTC'))           AS bstart,
      LEAST(b.end_date,   ((d + 1)::timestamp AT TIME ZONE 'UTC'))         AS bend,
      d
    FROM days
    JOIN public.bookings b
      ON b.listing_id = target_listing_id
     AND b.escrow_status IN ('pending', 'held', 'released', 'completed')
     AND b.status != 'cancelled'
     AND b.start_date < ((d + 1)::timestamp AT TIME ZONE 'UTC')
     AND b.end_date   > (d::timestamp AT TIME ZONE 'UTC')
  ),
  agg AS (
    SELECT d, COALESCE(SUM(EXTRACT(EPOCH FROM (bend - bstart))), 0) AS busy_seconds
    FROM days LEFT JOIN busy USING (d)
    GROUP BY d
  )
  SELECT
    a.d AS day,
    CASE
      WHEN a.busy_seconds >= 86400 THEN 'booked'
      WHEN a.busy_seconds > 0      THEN 'partial'
      ELSE 'open'
    END AS status
  FROM agg a
  ORDER BY a.d;
END;
$$;
