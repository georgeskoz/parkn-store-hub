-- messages.body/content bug fix surfaced a second, connected gap: nothing
-- ever updates conversations.last_message_at when a message is inserted --
-- confirmed live by inserting a real message directly and re-reading the
-- conversation row (last_message_at stayed null). ConversationsList.tsx's
-- "Last message: {{datetime}}" line depends entirely on this column, so
-- without a trigger it will show the new "No messages yet" empty state
-- forever, even once real messages exist.
--
-- A trigger (not a client-side update in handleSend) so it's correct
-- regardless of which code path inserts a message -- ConversationPanel.tsx's
-- handleSend, and request-extension's system-message insert, both benefit
-- without duplicating the same update in both places.
create or replace function public.touch_conversation_last_message_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set last_message_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists messages_touch_last_message_at on public.messages;

create trigger messages_touch_last_message_at
after insert on public.messages
for each row
execute function public.touch_conversation_last_message_at();
