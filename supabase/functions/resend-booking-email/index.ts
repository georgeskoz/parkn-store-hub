/**
 * resend-booking-email — Supabase Edge Function
 *
 * Lets either party on a booking re-trigger their own confirmation email
 * on demand (the "Resend email" button on the receipt page/screen).
 * Reuses the same composition logic added to stripe-webhook's
 * sendBookingConfirmationEmails() (booking_confirmed / booking_new
 * templates via the shared send-email dispatcher) rather than duplicating
 * the HTML -- this function only resolves who's asking and what to send
 * them, then calls send-email exactly the same way the webhook does.
 *
 * POST body: { bookingId: string }
 * Auth: Authorization: Bearer <caller's Supabase access token>. The caller
 * must be either the renter or the host of the booking (verified via
 * supabase.auth.getUser(), same trust boundary as complete-rental /
 * request-extension) -- an outsider can't use this to email themselves a
 * stranger's booking details.
 *
 * Sends only to the calling party's own email (renter -> booking_confirmed,
 * host -> booking_new), not to the other party -- "resend my email", not
 * "notify them again".
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const authHeader = req.headers.get("Authorization") ?? "";
    const { data: userData } = await supabase.auth.getUser(authHeader.replace(/^Bearer\s+/i, ""));
    const user = userData.user;
    if (!user) throw new Error("Unauthorized");

    const { bookingId } = await req.json();
    if (!bookingId) throw new Error("bookingId is required");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: booking } = await admin
      .from("bookings")
      .select(`
        id, total_amount, payout_amount, start_date, end_date, renter_id, host_id,
        listings ( id, title, user_id )
      `)
      .eq("id", bookingId)
      .maybeSingle();
    if (!booking) throw new Error("Booking not found");

    const listing = booking.listings as { id?: string; title?: string; user_id?: string } | null;
    const hostId = (booking.host_id ?? listing?.user_id ?? null) as string | null;
    const renterId = booking.renter_id as string | null;

    const isRenter = renterId === user.id;
    const isHost = hostId === user.id;
    if (!isRenter && !isHost) throw new Error("Not authorized for this booking");

    const listingTitle = listing?.title ?? "—";
    const startDate = fmtDate(booking.start_date as string | null);
    const endDate = fmtDate(booking.end_date as string | null);
    const total = Number(booking.total_amount ?? 0);

    const { data: myProfile } = await admin
      .from("profiles")
      .select("display_name, full_name")
      .eq("id", user.id)
      .maybeSingle();
    const myName = myProfile?.display_name ?? myProfile?.full_name ?? user.email ?? "";

    let template: string;
    let data: Record<string, unknown>;

    if (isRenter) {
      template = "booking_confirmed";
      data = {
        seeker_name: myName,
        listing_title: listingTitle,
        start_date: startDate,
        end_date: endDate,
        total_amount: total.toFixed(2),
        booking_id: bookingId,
        stripe_receipt_url: "",
      };
    } else {
      const { data: renterProfile } = renterId
        ? await admin.from("profiles").select("display_name, full_name").eq("id", renterId).maybeSingle()
        : { data: null };
      const payoutAmount = booking.payout_amount != null ? Number(booking.payout_amount) : total * 0.9;
      template = "booking_new";
      data = {
        host_name: myName,
        seeker_name: renterProfile?.display_name ?? renterProfile?.full_name ?? "Guest",
        listing_title: listingTitle,
        start_date: startDate,
        end_date: endDate,
        payout_amount: payoutAmount.toFixed(2),
        booking_id: bookingId,
      };
    }

    if (!user.email) throw new Error("No email address on your account to send to");

    const { error: sendError } = await admin.functions.invoke("send-email", {
      body: { template, to: user.email, data, user_id: user.id, booking_id: bookingId },
    });
    if (sendError) throw new Error(sendError.message);

    return new Response(JSON.stringify({ ok: true, sentTo: user.email }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
