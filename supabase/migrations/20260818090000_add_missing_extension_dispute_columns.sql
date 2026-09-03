-- booking_extensions and disputes were missing columns that
-- request-extension, respond-extension, and open-dispute already write to --
-- confirmed via information_schema.columns against production, not file
-- assumptions. Their INSERT/UPDATE calls have been failing outright.
--
-- rate is `text`, not `numeric`: request-extension/index.ts:62 inserts the
-- literal string "hourly" (not the computed numeric rate), so numeric would
-- break that insert immediately. Matches what the code actually does today;
-- whether that's itself a bug in request-extension is a separate question,
-- not addressed here.
ALTER TABLE public.booking_extensions
  ADD COLUMN IF NOT EXISTS requested_by uuid,
  ADD COLUMN IF NOT EXISTS extra_hours numeric,
  ADD COLUMN IF NOT EXISTS rate text,
  ADD COLUMN IF NOT EXISTS extra_units numeric,
  ADD COLUMN IF NOT EXISTS new_end_date timestamptz,
  ADD COLUMN IF NOT EXISTS responded_at timestamptz;

ALTER TABLE public.disputes
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS evidence_urls text[];
