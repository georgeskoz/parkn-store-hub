import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLATFORM_COMMISSION_PERCENT = 10;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    let bookingIds: string[] = [];
    try {
      const body = await req.json();
      if (body?.bookingId) bookingIds = [body.bookingId];
    } catch (_) {}

    // Find releasable bookings
    let query = admin
      .from("bookings")
      .select("id, provider_id, total_price, overdue_charges_total, payment_intent_id, released_transfer_id")
      .eq("escrow_status", "held")
      .lte("auto_release_at", new Date().toISOString())
      .is("released_at", null);
    if (bookingIds.length) query = query.in("id", bookingIds);

    const { data: bookings, error } = await query;
    if (error) throw error;

    const results: Array<Record<string, unknown>> = [];

    for (const b of bookings || []) {
      if (b.released_transfer_id) continue;
      // Look up provider Connect account
      const { data: provider } = await admin
        .from("profiles")
        .select("stripe_account_id, stripe_onboarding_complete")
        .eq("id", b.provider_id)
        .maybeSingle();

      if (!provider?.stripe_account_id || !provider.stripe_onboarding_complete) {
        results.push({ id: b.id, skipped: "provider_not_onboarded" });
        continue;
      }

      const grossCents = Math.round((Number(b.total_price) + Number(b.overdue_charges_total || 0)) * 100);
      const feeCents = Math.round(grossCents * PLATFORM_COMMISSION_PERCENT / 100);
      const payoutCents = grossCents - feeCents;

      try {
        const transfer = await stripe.transfers.create({
          amount: payoutCents,
          currency: "cad",
          destination: provider.stripe_account_id,
          transfer_group: `booking_${b.id}`,
          metadata: { booking_id: b.id },
        });
        await admin
          .from("bookings")
          .update({
            escrow_status: "released",
            released_at: new Date().toISOString(),
            released_transfer_id: transfer.id,
            payout_amount: payoutCents / 100,
          })
          .eq("id", b.id);
        results.push({ id: b.id, released: true, transfer: transfer.id });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({ id: b.id, error: msg });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
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
