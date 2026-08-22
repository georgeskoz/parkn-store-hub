-- conversations has RLS enabled but zero policies -- confirmed live via the
-- Dashboard ("No policies created yet") and via a real authenticated click
-- as peterkozah@outlook.com: SELECT silently returns 200/empty (RLS just
-- filters rows, no error), INSERT returns 403
-- ("new row violates row-level security policy for table \"conversations\"").
-- With RLS on and no policies, every role is denied, including
-- authenticated users acting on their own bookings -- this blocked both
-- the new Message Host button (SeekerBookingsList.tsx, correctly built
-- against booking_id) and the older, separately-broken pre-booking flow
-- (ListingDetail.tsx/ConversationPanel.tsx, which also has a column-name
-- bug, tracked separately).
--
-- conversations doesn't store renter_id/host_id itself -- only booking_id
-- (confirmed live) -- so membership has to be checked by joining through
-- bookings.
CREATE POLICY "Booking parties can view their conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bookings
    WHERE bookings.id = conversations.booking_id
      AND (auth.uid() = bookings.renter_id OR auth.uid() = bookings.host_id)
  )
);

CREATE POLICY "Booking parties can create conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.bookings
    WHERE bookings.id = conversations.booking_id
      AND (auth.uid() = bookings.renter_id OR auth.uid() = bookings.host_id)
  )
);

-- messages already had two policies ("Users can send messages" INSERT,
-- "Users can view their messages" SELECT), but both check sender_id/
-- receiver_id directly on the message row -- and receiver_id is never
-- populated by any existing code path (ConversationPanel.tsx's handleSend
-- only ever sets sender_id, confirmed by reading that file). In practice
-- the sender could always read their own sent messages back, but the
-- recipient never could. Replacing both with the same booking-party-via-
-- conversation check used above, so message access follows actual
-- conversation membership instead of a column nothing writes to.
--
-- messages also has zero UPDATE policy -- ConversationPanel.tsx's
-- markRead() does `update messages set read_at = ... where
-- conversation_id = ... and sender_id != user.id and read_at is null`,
-- which has been silently blocked by RLS default-deny the same way INSERT
-- on conversations was. Adding one so read receipts actually work once
-- conversations can be created at all.
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view their messages" ON public.messages;

CREATE POLICY "Conversation parties can view messages"
ON public.messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.conversations
    JOIN public.bookings ON bookings.id = conversations.booking_id
    WHERE conversations.id = messages.conversation_id
      AND (auth.uid() = bookings.renter_id OR auth.uid() = bookings.host_id)
  )
);

CREATE POLICY "Conversation parties can send messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1
    FROM public.conversations
    JOIN public.bookings ON bookings.id = conversations.booking_id
    WHERE conversations.id = messages.conversation_id
      AND (auth.uid() = bookings.renter_id OR auth.uid() = bookings.host_id)
  )
);

CREATE POLICY "Conversation parties can update messages"
ON public.messages
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.conversations
    JOIN public.bookings ON bookings.id = conversations.booking_id
    WHERE conversations.id = messages.conversation_id
      AND (auth.uid() = bookings.renter_id OR auth.uid() = bookings.host_id)
  )
);
