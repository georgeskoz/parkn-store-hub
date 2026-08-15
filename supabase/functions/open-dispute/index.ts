import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_REASONS = new Set([
  "item_not_as_described",
  "no_show",
  "property_damage",
  "unauthorized_charge",
  "safety_concern",
  "other",
]);

const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const authHeader = req.headers.get("Authorization") || "";
    const { data: userData } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    const user = userData.user;
    if (!user) throw new Error("Unauthorized");

    const body = await req.json();
    const booking_id = body.booking_id || body.bookingId;
    const reason = body.reason;
    const description = String(body.description || "").trim();
    const evidence_urls: string[] = Array.isArray(body.evidence_urls)
      ? body.evidence_urls.slice(0, 3)
      : [];

    if (!booking_id) throw new Error("Missing booking_id");
    if (!reason || !VALID_REASONS.has(reason)) throw new Error("Invalid reason");
    if (description.length < 20 || description.length > 1000) {
      throw new Error("Description must be 20–1000 characters");
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: booking, error: bErr } = await admin
      .from("bookings")
      .select("id, renter_id, host_id, status, end_date, escrow_status")
      .eq("id", booking_id)
      .maybeSingle();
    if (bErr) throw bErr;
    if (!booking) throw new Error("Booking not found");
    if (booking.renter_id !== user.id && booking.host_id !== user.id) {
      throw new Error("Not authorized");
    }
    if (!["active", "completed"].includes(booking.status)) {
      throw new Error("Disputes only allowed on active or completed bookings");
    }
    const end = new Date(booking.end_date).getTime();
    if (Date.now() - end > WINDOW_MS) {
      throw new Error("Dispute window has expired");
    }

    const { data: existing } = await admin
      .from("disputes")
      .select("id")
      .eq("booking_id", booking_id)
      .maybeSingle();
    if (existing) throw new Error("A dispute already exists for this booking");

    const { data: inserted, error: insErr } = await admin
      .from("disputes")
      .insert({
        booking_id,
        raised_by: user.id,
        reason,
        description,
        evidence_urls,
        status: "open",
      })
      .select()
      .single();
    if (insErr) throw insErr;

    // Mark escrow disputed if currently held
    if (booking.escrow_status === "held") {
      await admin
        .from("bookings")
        .update({
          escrow_status: "disputed",
          dispute_opened_at: new Date().toISOString(),
          dispute_reason: reason,
        })
        .eq("id", booking_id);
    }

    return new Response(JSON.stringify({ ok: true, dispute: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
