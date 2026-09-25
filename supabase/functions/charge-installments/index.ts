// charge-installments — Supabase Edge Function
//
// Charges due booking_installments rows (sequence 2..N of a "pay in
// installments" booking) off-session, then immediately transfers the
// host's share for each one that succeeds -- per Georges's explicit
// decision, each installment's payout releases as soon as it's charged,
// rather than being held for the whole booking the way processBookingPayout
// works.
//
// Modeled directly on charge-overdue/index.ts: same service_role-only auth
// gate (config.toml sets verify_jwt = false so this can be cron-triggered),
// same off-session PaymentIntent pattern, same per-row try/catch so one
// failing installment doesn't block the rest.
//
// Deliberately does NOT use a Stripe Connect destination charge here, even
// if the host has completed Connect onboarding and installment 1 itself was
// a destination charge (see create-payment-intent/create-booking-payment).
// Every installment charged by this function lands on the platform's own
// Stripe balance, and the host's share is moved out via a separate
// stripe.transfers.create() call right after -- this keeps the "did we
// double-pay this installment" question answerable from booking_installments
// alone (host_transfer_id set = already paid), without needing to also
// track which charge type was used.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function callerRole(req: Request): string | null {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  try {
    const payload = token.split(".")[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const claims = JSON.parse(atob(padded));
    return typeof claims.role === "string" ? claims.role : null;
  } catch {
    return null;
  }
}

// Transfers a single installment's host share, given a hostId already
// resolved by the caller. Shared by the main charge loop below and the
// self-healing retry pass, so both go through the exact same guard/update
// logic instead of two copies that could drift.
async function releaseInstallmentPayout(
  admin: ReturnType<typeof createClient>,
  stripe: any,
  inst: { id: string; booking_id: string; amount: number; sequence: number },
  hostId: string,
  currency: string,
): Promise<Record<string, unknown>> {
  const { data: hostProfile } = await admin
    .from("profiles")
    .select("stripe_account_id")
    .eq("id", hostId)
    .maybeSingle();
  if (!hostProfile?.stripe_account_id) {
    return { id: inst.id, payout_skipped: "host_not_onboarded" };
  }

  const hostPayoutAmount = Number(inst.amount);
  const payoutCents = Math.round(hostPayoutAmount * 100);
  try {
    const transfer = await stripe.transfers.create({
      amount: payoutCents,
      currency,
      destination: hostProfile.stripe_account_id,
      transfer_group: `booking_${inst.booking_id}`,
      metadata: { booking_id: inst.booking_id, installment_id: inst.id, sequence: String(inst.sequence) },
    });
    await admin
      .from("booking_installments")
      .update({
        host_payout_amount: hostPayoutAmount,
        host_transfer_id: transfer.id,
        released_at: new Date().toISOString(),
      })
      .eq("id", inst.id);
    return { id: inst.id, payout: hostPayoutAmount, transfer_id: transfer.id };
  } catch (payoutErr) {
    const payoutMsg = payoutErr instanceof Error ? payoutErr.message : String(payoutErr);
    // Charge already succeeded -- leave host_transfer_id null so the
    // self-healing retry pass below picks this row up again next hour
    // instead of the payout being silently lost.
    return { id: inst.id, payout_error: payoutMsg };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // This is the only check standing between the public internet and real
  // Stripe charges -- same comment/reasoning as charge-overdue.
  if (callerRole(req) !== "service_role") {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const today = new Date().toISOString().slice(0, 10);
    const { data: dueInstallments, error } = await admin
      .from("booking_installments")
      .select("id, booking_id, sequence, amount, total_amount, status, due_date")
      .eq("status", "pending")
      .lte("due_date", today);
    if (error) throw error;

    const results: Array<Record<string, unknown>> = [];

    for (const inst of dueInstallments || []) {
      const { data: booking } = await admin
        .from("bookings")
        .select("id, host_id, currency, stripe_customer_id, stripe_payment_method_id, listings ( user_id )")
        .eq("id", inst.booking_id)
        .maybeSingle();

      if (!booking) {
        results.push({ id: inst.id, skipped: "booking_not_found" });
        continue;
      }
      const b = booking as any;

      if (!b.stripe_customer_id || !b.stripe_payment_method_id) {
        // Same gap charge-overdue already has to handle -- the webhook that
        // captures stripe_payment_method_id onto the booking after checkout
        // may not have run yet, or (destination-charge host, no
        // setup_future_usage in the old code path) never will. Left pending
        // so a later run can pick it up once the column is populated.
        results.push({ id: inst.id, skipped: "no_payment_method" });
        continue;
      }

      const amountCents = Math.round(Number(inst.total_amount) * 100);
      const currency = (b.currency || "cad").toLowerCase();

      try {
        const pi = await stripe.paymentIntents.create({
          amount: amountCents,
          currency,
          customer: b.stripe_customer_id,
          payment_method: b.stripe_payment_method_id,
          off_session: true,
          confirm: true,
          description: `Installment ${inst.sequence} for booking ${inst.booking_id}`,
          transfer_group: `booking_${inst.booking_id}`,
          metadata: { booking_id: inst.booking_id, installment_id: inst.id, sequence: String(inst.sequence) },
        });

        const chargedAt = new Date().toISOString();
        await admin
          .from("booking_installments")
          .update({ status: "succeeded", stripe_payment_intent_id: pi.id, charged_at: chargedAt })
          .eq("id", inst.id);
        results.push({ id: inst.id, charged: Number(inst.total_amount), booking_id: inst.booking_id });

        // Release this installment's host share immediately (Georges's
        // explicit decision -- release per installment, not per booking).
        // A missing/incomplete Connect account is not a charge failure --
        // the charge already succeeded -- so this is logged as a skip, not
        // retried as an error; host_transfer_id staying null is exactly
        // what marks it as still owed, and the self-healing retry pass
        // below picks it up on a later run once onboarding completes.
        const hostId = b.host_id ?? b.listings?.user_id;
        if (!hostId) {
          results.push({ id: inst.id, payout_skipped: "no_host" });
          continue;
        }
        results.push(await releaseInstallmentPayout(admin, stripe, inst, hostId, currency));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await admin
          .from("booking_installments")
          .update({ status: "failed", error_message: msg })
          .eq("id", inst.id);
        results.push({ id: inst.id, error: msg });
      }
    }

    // Self-healing retry pass: an installment already marked 'succeeded'
    // (charge went through) but with host_transfer_id still null -- a
    // transient Stripe error on the transfer, or a host who finished
    // Connect onboarding only after the charge already happened -- would
    // otherwise be stuck forever, since the due-installments query above
    // only ever selects status='pending' rows and this row's status is no
    // longer 'pending'. This re-attempts exactly those rows. It runs once
    // per hourly cron firing (not concurrently), so there's no risk of the
    // same row being transferred twice within a single run.
    const { data: unpaidInstallments } = await admin
      .from("booking_installments")
      .select("id, booking_id, sequence, amount")
      .eq("status", "succeeded")
      .is("host_transfer_id", null);

    for (const inst of unpaidInstallments || []) {
      const { data: booking } = await admin
        .from("bookings")
        .select("host_id, currency, listings ( user_id )")
        .eq("id", inst.booking_id)
        .maybeSingle();
      const b = booking as any;
      if (!b) {
        results.push({ id: inst.id, retry: true, retry_skipped: "booking_not_found" });
        continue;
      }
      const hostId = b.host_id ?? b.listings?.user_id;
      if (!hostId) {
        results.push({ id: inst.id, retry: true, retry_skipped: "no_host" });
        continue;
      }
      const retryResult = await releaseInstallmentPayout(
        admin,
        stripe,
        inst,
        hostId,
        (b.currency || "cad").toLowerCase(),
      );
      results.push({ retry: true, ...retryResult });
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
