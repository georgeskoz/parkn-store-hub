import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

// The generated types are stale for conversations: they still require
// listing_id / provider_id / seeker_id, which don't exist on the live table
// (confirmed 42703, see ConversationPanel.tsx). The live insert is
// { booking_id } only -- same as SeekerBookingsList.
type ConversationInsert = Database["public"]["Tables"]["conversations"]["Insert"];

/**
 * Find-or-create the conversation for a booking and return its id.
 *
 * Conversations are keyed by booking_id only (there is no pre-booking
 * listing/host conversation -- see ConversationPanel.tsx), so messaging a
 * host always goes through one of the caller's own bookings. Same steps as
 * SeekerBookingsList's "Message host" button; RLS on conversations limits
 * this to the booking's renter and host.
 */
export async function openBookingConversation(bookingId: string): Promise<string> {
  const { data: existing, error: findErr } = await supabase
    .from("conversations")
    .select("id")
    .eq("booking_id", bookingId)
    .maybeSingle();
  if (findErr) throw findErr;
  if (existing?.id) return existing.id as string;

  const { data: created, error: createErr } = await supabase
    .from("conversations")
    .insert({ booking_id: bookingId } as unknown as ConversationInsert)
    .select("id")
    .single();
  if (createErr) throw createErr;
  return created.id as string;
}
