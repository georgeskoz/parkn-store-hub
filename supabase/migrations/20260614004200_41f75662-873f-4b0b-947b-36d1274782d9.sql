
CREATE OR REPLACE FUNCTION public.get_available_slots(_listing_id uuid, _check_date date)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  day_start timestamptz := (_check_date::timestamp AT TIME ZONE 'UTC');
  day_end   timestamptz := ((_check_date + 1)::timestamp AT TIME ZONE 'UTC');
  busy_blocks jsonb := '[]'::jsonb;
  free_blocks jsonb := '[]'::jsonb;
  cursor_ts timestamptz := day_start;
  r record;
BEGIN
  -- Walk bookings that overlap this day and are actively holding the spot
  FOR r IN
    SELECT
      GREATEST(start_date, day_start) AS bstart,
      LEAST(end_date, day_end)        AS bend
    FROM public.bookings
    WHERE listing_id = _listing_id
      AND escrow_status IN ('held', 'released', 'completed', 'pending')
      AND status <> 'cancelled'
      AND start_date < day_end
      AND end_date   > day_start
    ORDER BY start_date ASC
  LOOP
    busy_blocks := busy_blocks || jsonb_build_object(
      'start', to_char(r.bstart AT TIME ZONE 'UTC', 'HH24:MI'),
      'end',   to_char(r.bend   AT TIME ZONE 'UTC', 'HH24:MI')
    );
    IF r.bstart > cursor_ts THEN
      free_blocks := free_blocks || jsonb_build_object(
        'start', to_char(cursor_ts AT TIME ZONE 'UTC', 'HH24:MI'),
        'end',   to_char(r.bstart   AT TIME ZONE 'UTC', 'HH24:MI')
      );
    END IF;
    IF r.bend > cursor_ts THEN
      cursor_ts := r.bend;
    END IF;
  END LOOP;

  IF cursor_ts < day_end THEN
    free_blocks := free_blocks || jsonb_build_object(
      'start', to_char(cursor_ts AT TIME ZONE 'UTC', 'HH24:MI'),
      'end',   '24:00'
    );
  END IF;

  RETURN jsonb_build_object(
    'date', _check_date,
    'available', free_blocks,
    'busy', busy_blocks
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_available_slots(uuid, date) TO anon, authenticated, service_role;
