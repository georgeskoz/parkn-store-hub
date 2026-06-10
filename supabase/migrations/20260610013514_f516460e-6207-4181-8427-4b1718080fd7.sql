
-- 1. Stripe Connect on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN NOT NULL DEFAULT false;

-- 2. Conversations
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  seeker_id UUID NOT NULL,
  provider_id UUID NOT NULL,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (listing_id, seeker_id, provider_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view their conversations"
  ON public.conversations FOR SELECT TO authenticated
  USING (auth.uid() = seeker_id OR auth.uid() = provider_id);

CREATE POLICY "Seekers can create conversations"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = seeker_id);

CREATE POLICY "Participants can update their conversations"
  ON public.conversations FOR UPDATE TO authenticated
  USING (auth.uid() = seeker_id OR auth.uid() = provider_id);

-- 3. Messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 4000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, created_at);

GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read messages"
  ON public.messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id
      AND (c.seeker_id = auth.uid() OR c.provider_id = auth.uid())
  ));

CREATE POLICY "Participants can send messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.seeker_id = auth.uid() OR c.provider_id = auth.uid())
    )
  );

-- 4. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- 5. Trigger: bump conversations.last_message_at on new message
CREATE OR REPLACE FUNCTION public.bump_conversation_last_message()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE public.conversations SET last_message_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_messages_bump_conversation
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.bump_conversation_last_message();
