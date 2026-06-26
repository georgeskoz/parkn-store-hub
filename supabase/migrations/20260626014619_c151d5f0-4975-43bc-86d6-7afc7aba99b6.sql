
-- Allow both seekers and hosts to review each other within 14 days of completion
DROP POLICY IF EXISTS "Seekers can insert their own review for completed bookings" ON public.reviews;

CREATE POLICY "Users can review counterparties for completed bookings within 14 days"
ON public.reviews
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = reviewer_id
  AND EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = reviews.booking_id
      AND b.status = 'completed'
      AND b.listing_id = reviews.listing_id
      AND (
        -- Seeker reviewing host
        (b.seeker_id = auth.uid() AND b.provider_id = reviews.reviewee_id)
        OR
        -- Host reviewing seeker
        (b.provider_id = auth.uid() AND b.seeker_id = reviews.reviewee_id)
      )
      AND COALESCE(b.released_at, b.updated_at) > (now() - interval '14 days')
  )
);

-- Prevent duplicate reviews per booking per direction
CREATE UNIQUE INDEX IF NOT EXISTS reviews_unique_per_reviewer_per_booking
  ON public.reviews (booking_id, reviewer_id);
