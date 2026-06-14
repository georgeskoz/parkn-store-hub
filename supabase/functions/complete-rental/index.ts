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

    const { bookingId, role } = await req.json();
    if (!bookingId || !["seeker", "provider"].includes(role)) throw new Error("Invalid payload");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: booking } = await admin
      .from("bookings")
      .select("id, seeker_id, provider_id, escrow_status, completed_by_provider_at, completed_by_seeker_at")
      .eq("id", bookingId)
      .maybeSingle();
    if (!booking) throw new Error("Booking not found");

    const update: Record<string, unknown> = {};
    if (role === "seeker") {
      if (booking.seeker_id !== user.id) throw new Error("Not authorized");
      update.completed_by_seeker_at = new Date().toISOString();
    } else {
      if (booking.provider_id !== user.id) throw new Error("Not authorized");
      update.completed_by_provider_at = new Date().toISOString();
    }

    // If both parties have confirmed (or seeker has confirmed and we trust pickup), fast-forward release
    const bothDone =
      (role === "seeker" && booking.completed_by_provider_at) ||
      (role === "provider" && booking.completed_by_seeker_at);
    if (bothDone && booking.escrow_status === "held") {
      update.auto_release_at = new Date().toISOString();
    }

    await admin.from("bookings").update(update).eq("id", bookingId);

    return new Response(JSON.stringify({ ok: true, fastReleased: !!update.auto_release_at }), {
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
