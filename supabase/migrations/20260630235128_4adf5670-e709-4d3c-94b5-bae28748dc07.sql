ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS vehicle_plate text,
  ADD COLUMN IF NOT EXISTS vehicle_type text,
  ADD COLUMN IF NOT EXISTS vehicle_make text,
  ADD COLUMN IF NOT EXISTS vehicle_colour text,
  ADD COLUMN IF NOT EXISTS drivers_license text,
  ADD COLUMN IF NOT EXISTS license_province_state text,
  ADD COLUMN IF NOT EXISTS storage_items jsonb,
  ADD COLUMN IF NOT EXISTS storage_notes text,
  ADD COLUMN IF NOT EXISTS storage_size text,
  ADD COLUMN IF NOT EXISTS dropoff_date date,
  ADD COLUMN IF NOT EXISTS dropoff_time time;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS postal_code text;