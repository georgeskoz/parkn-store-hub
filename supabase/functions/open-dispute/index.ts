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

    const { bookingId, reason } = await req.json();
    if (!bookingId || !reason) throw new Error("Invalid payload");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: booking } = await admin
      .from("bookings")
      .select("seeker_id, provider_id, escrow_status")
      .eq("id", bookingId)
      .maybeSingle();
    if (!booking) throw new Error("Booking not found");
    if (booking.seeker_id !== user.id && booking.provider_id !== user.id) {
      throw new Error("Not authorized");
    }
    if (booking.escrow_status === "released") throw new Error("Already released");

    await admin
      .from("bookings")
      .update({
        escrow_status: "disputed",
        dispute_opened_at: new Date().toISOString(),
        dispute_reason: String(reason).slice(0, 1000),
      })
      .eq("id", bookingId);

    return new Response(JSON.stringify({ ok: true }), {
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
