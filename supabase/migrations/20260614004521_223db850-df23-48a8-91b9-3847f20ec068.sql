
CREATE OR REPLACE FUNCTION public.get_available_slots(
  target_listing_id uuid,
  start_search timestamptz,
  end_search timestamptz
)
RETURNS TABLE (available_start timestamptz, available_end timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cursor_ts timestamptz := start_search;
  r record;
BEGIN
  IF end_search <= start_search THEN
    RETURN;
  END IF;

  FOR r IN
    SELECT
      GREATEST(b.start_date, start_search) AS bstart,
      LEAST(b.end_date,   end_search)      AS bend
    FROM public.bookings b
    WHERE b.listing_id = target_listing_id
      AND b.escrow_status IN ('held', 'completed')
      AND b.start_date < end_search
      AND b.end_date   > start_search
    ORDER BY b.start_date ASC
  LOOP
    IF r.bstart > cursor_ts THEN
      available_start := cursor_ts;
      available_end   := r.bstart;
      RETURN NEXT;
    END IF;
    IF r.bend > cursor_ts THEN
      cursor_ts := r.bend;
    END IF;
  END LOOP;

  IF cursor_ts < end_search THEN
    available_start := cursor_ts;
    available_end   := end_search;
    RETURN NEXT;
  END IF;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_available_slots(uuid, timestamptz, timestamptz)
  TO anon, authenticated, service_role;
