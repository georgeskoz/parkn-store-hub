import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_OVERDUE_DAYS = 7;

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
    // Find held bookings past end_date with no seeker completion
    const { data: bookings, error } = await admin
      .from("bookings")
      .select("id, listing_id, end_date, stripe_customer_id, stripe_payment_method_id, overdue_charges_total, completed_by_seeker_at, seeker_id")
      .eq("escrow_status", "held")
      .lt("end_date", new Date().toISOString())
      .is("completed_by_seeker_at", null);
    if (error) throw error;

    const results: Array<Record<string, unknown>> = [];

    for (const b of bookings || []) {
      if (!b.stripe_customer_id || !b.stripe_payment_method_id) {
        results.push({ id: b.id, skipped: "no_payment_method" });
        continue;
      }

      const { data: listing } = await admin
        .from("listings")
        .select("daily, hourly")
        .eq("id", b.listing_id)
        .maybeSingle();
      const baseRate = Number(listing?.daily ?? listing?.hourly ?? 0);
      if (!baseRate) {
        results.push({ id: b.id, skipped: "no_rate" });
        continue;
      }

      const endMs = new Date(b.end_date).getTime();
      const nowMs = Date.now();
      const daysOverdue = Math.min(
        MAX_OVERDUE_DAYS,
        Math.max(1, Math.ceil((nowMs - endMs) / (24 * 3600 * 1000))),
      );

      // Check existing charge rows
      const { data: existing } = await admin
        .from("overdue_charges")
        .select("charge_date")
        .eq("booking_id", b.id);
      const chargedDates = new Set((existing || []).map((r: any) => r.charge_date));

      for (let day = 1; day <= daysOverdue; day++) {
        const chargeDate = new Date(endMs + day * 24 * 3600 * 1000)
          .toISOString()
          .slice(0, 10);
        if (chargedDates.has(chargeDate)) continue;

        const amount = +(baseRate * 2).toFixed(2);
        const amountCents = Math.round(amount * 100);

        const { data: row } = await admin
          .from("overdue_charges")
          .insert({
            booking_id: b.id,
            charge_date: chargeDate,
            units: 1,
            rate: baseRate * 2,
            amount,
            status: "pending",
          })
          .select("id")
          .single();

        try {
          const pi = await stripe.paymentIntents.create({
            amount: amountCents,
            currency: "cad",
            customer: b.stripe_customer_id,
            payment_method: b.stripe_payment_method_id,
            off_session: true,
            confirm: true,
            description: `Overdue 2x charge for booking ${b.id} on ${chargeDate}`,
            transfer_group: `booking_${b.id}`,
            metadata: { booking_id: b.id, overdue_date: chargeDate },
          });
          await admin
            .from("overdue_charges")
            .update({ status: "succeeded", payment_intent_id: pi.id })
            .eq("id", row?.id);
          // increment total
          await admin
            .from("bookings")
            .update({
              overdue_charges_total: Number(b.overdue_charges_total || 0) + amount,
              last_overdue_charge_at: new Date().toISOString(),
            })
            .eq("id", b.id);
          b.overdue_charges_total = Number(b.overdue_charges_total || 0) + amount;
          results.push({ id: b.id, charged: amount, date: chargeDate });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          await admin
            .from("overdue_charges")
            .update({ status: "failed", error_message: msg })
            .eq("id", row?.id);
          results.push({ id: b.id, error: msg, date: chargeDate });
        }
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
