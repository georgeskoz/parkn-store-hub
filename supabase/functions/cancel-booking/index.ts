import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Cancellation policy:
//  - 24h+ before start_date → 100% refund
//  - within 24h of start_date → 50% refund
//  - after start_date (no-show) → 0% refund
function computeRefundPercent(startDate: Date, now: Date): number {
  const ms = startDate.getTime() - now.getTime();
  const hours = ms / (1000 * 60 * 60);
  if (hours >= 24) return 100;
  if (hours > 0) return 50;
  return 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims } = await supabase.auth.getClaims(token);
    if (!claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const bookingId = String(body.bookingId || "");
    const reason = body.reason ? String(body.reason).slice(0, 500) : null;
    const adminOverrideFullRefund = body.adminOverrideFullRefund === true;
    if (!bookingId) throw new Error("bookingId is required");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Is this user admin?
    const { data: isAdminRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    const isAdmin = !!isAdminRow;

    const { data: booking, error: bErr } = await admin
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();
    if (bErr || !booking) throw new Error("Booking not found");

    if (booking.seeker_id !== userId && !isAdmin) {
      return new Response(
        JSON.stringify({ error: "Only the seeker (or an admin) can cancel" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (["cancelled", "completed", "refunded"].includes(booking.status)) {
      return new Response(
        JSON.stringify({ error: `Cannot cancel a ${booking.status} booking` }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const now = new Date();
    const startDate = new Date(booking.start_date);
    let refundPercent = computeRefundPercent(startDate, now);
    if (isAdmin && adminOverrideFullRefund) refundPercent = 100;

    const totalAmount = Number(booking.total_amount) || 0;
    const refundAmount = +(totalAmount * (refundPercent / 100)).toFixed(2);
    const refundCents = Math.round(refundAmount * 100);

    let stripeRefundId: string | null = null;
    let refundStatus: "none" | "succeeded" | "failed" | "pending" = "none";
    let refundError: string | null = null;

    if (refundCents > 0 && booking.payment_intent_id) {
      try {
        const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
          apiVersion: "2025-08-27.basil",
        });
        const refund = await stripe.refunds.create({
          payment_intent: booking.payment_intent_id,
          amount: refundCents,
          reason: "requested_by_customer",
          metadata: { booking_id: bookingId, cancelled_by: userId },
        });
        stripeRefundId = refund.id;
        refundStatus = (refund.status as any) === "succeeded"
          ? "succeeded"
          : "pending";
      } catch (e) {
        refundStatus = "failed";
        refundError = e instanceof Error ? e.message : String(e);
      }
    }

    const { error: updErr } = await admin
      .from("bookings")
      .update({
        status: "cancelled",
        cancelled_at: now.toISOString(),
        refund_amount: refundAmount,
        refund_status: refundStatus,
        stripe_refund_id: stripeRefundId,
        cancellation_reason: reason,
      })
      .eq("id", bookingId);
    if (updErr) throw new Error(updErr.message);

    // Best-effort email notifications (no-op if email infra not configured)
    try {
      await admin.functions.invoke("send-transactional-email", {
        body: {
          templateName: "booking-cancelled-seeker",
          recipientEmail: claims.claims.email,
          idempotencyKey: `cancel-seeker-${bookingId}`,
          templateData: { refundAmount, refundPercent },
        },
      });
    } catch (_) { /* email infra optional */ }

    return new Response(
      JSON.stringify({
        success: true,
        refundAmount,
        refundPercent,
        refundStatus,
        refundError,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
