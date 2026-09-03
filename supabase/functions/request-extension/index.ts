import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const authHeader = req.headers.get("Authorization")!;
    const { data: userData } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    const user = userData.user;
    if (!user) throw new Error("Unauthorized");

    const { bookingId, extraHours } = await req.json();
    if (!bookingId || !extraHours || extraHours <= 0) throw new Error("Invalid payload");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: booking } = await admin
      .from("bookings")
      .select("id, listing_id, renter_id, host_id, end_date")
      .eq("id", bookingId)
      .maybeSingle();
    if (!booking) throw new Error("Booking not found");
    if (booking.renter_id !== user.id) throw new Error("Not your booking");

    const { data: listing } = await admin
      .from("listings")
      .select("price_hourly, price_daily")
      .eq("id", booking.listing_id)
      .maybeSingle();
    const hourly = Number(listing?.price_hourly ?? 0) || Number(listing?.price_daily ?? 0) / 24;
    if (!hourly) throw new Error("Listing has no hourly rate");

    const subtotal = +(hourly * extraHours).toFixed(2);
    const gst = +(subtotal * 0.05).toFixed(2);
    const qst = +(subtotal * 0.09975).toFixed(2);
    const total = +(subtotal + gst + qst).toFixed(2);

    const newEnd = new Date(
      new Date(booking.end_date).getTime() + extraHours * 3600 * 1000,
    ).toISOString();


    const { data: ext, error } = await admin
      .from("booking_extensions")
      .insert({
        booking_id: bookingId,
        requested_by: user.id,
        extra_hours: extraHours,
        rate: hourly,
        extra_units: extraHours,
        extra_amount: total,
        new_end_date: newEnd,
        status: "pending",
      })
      .select("id")
      .single();
    if (error) throw error;

    // Best-effort: drop a system message into the booking's conversation
    const { data: convo } = await admin
      .from("conversations")
      .select("id")
      .eq("booking_id", bookingId)
      .maybeSingle();
    if (convo?.id) {
      await admin.from("messages").insert({
        conversation_id: convo.id,
        sender_id: user.id,
        body: `Extension requested: +${extraHours}h for $${total.toFixed(2)} CAD. Awaiting your approval.`,
      });
    }

    return new Response(JSON.stringify({ extensionId: ext.id, total }), {
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
