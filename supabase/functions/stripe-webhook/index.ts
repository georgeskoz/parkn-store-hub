import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const whSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const sig = req.headers.get("stripe-signature") || "";
  const body = await req.text();

  if (!whSecret) {
    return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, whSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: `Invalid signature: ${msg}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const bookingId = session.metadata?.booking_id;
        if (!bookingId) break;

        let paymentMethodId: string | null = null;
        if (typeof session.payment_intent === "string") {
          try {
            const pi = await stripe.paymentIntents.retrieve(session.payment_intent);
            paymentMethodId =
              typeof pi.payment_method === "string" ? pi.payment_method : null;
          } catch (_) {}
        }

        const payoutAmount = session.amount_total != null
          ? session.amount_total / 100
          : null;

        const update: Record<string, unknown> = {
          status: "confirmed",
          escrow_status: "held",
          stripe_session_id: session.id,
        };
        if (typeof session.payment_intent === "string") {
          update.stripe_payment_intent_id = session.payment_intent;
        }
        if (typeof session.customer === "string") {
          update.stripe_customer_id = session.customer;
        }
        if (paymentMethodId) update.stripe_payment_method_id = paymentMethodId;
        if (payoutAmount != null) update.payout_amount = payoutAmount;

        const { error } = await supabase
          .from("bookings")
          .update(update)
          .eq("id", bookingId);
        if (error) throw error;
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const bookingId = session.metadata?.booking_id;
        if (!bookingId) break;

        // Only cancel if it never actually completed -- avoids racing a
        // checkout.session.completed event that landed first.
        const { data: booking } = await supabase
          .from("bookings")
          .select("status")
          .eq("id", bookingId)
          .maybeSingle();
        if (booking?.status === "pending") {
          await supabase
            .from("bookings")
            .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
            .eq("id", bookingId);
        }
        break;
      }

      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const bookingId = pi.metadata?.booking_id;
        const extensionId = pi.metadata?.extension_id;
        if (extensionId) {
          await supabase
            .from("booking_extensions")
            .update({ status: "paid", paid_at: new Date().toISOString(), payment_intent_id: pi.id })
            .eq("id", extensionId);
        }
        if (bookingId) {
          // Previously an un-checked await -- a failed write here (e.g. the
          // wrong column name below) returned 200 to Stripe regardless, so
          // Stripe never retried and the failure was invisible. Match
          // checkout.session.completed's pattern: capture the error and throw,
          // so a real failure surfaces as a 500 and Stripe retries it.
          const { error } = await supabase
            .from("bookings")
            .update({
              status: "confirmed",
              escrow_status: "held",
              stripe_payment_intent_id: pi.id,
              stripe_payment_method_id:
                typeof pi.payment_method === "string" ? pi.payment_method : null,
            })
            .eq("id", bookingId);
          if (error) throw error;
        }
        break;
      }

      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        const pi = typeof dispute.payment_intent === "string"
          ? dispute.payment_intent
          : null;
        if (pi) {
          await supabase
            .from("bookings")
            .update({
              escrow_status: "disputed",
              dispute_opened_at: new Date().toISOString(),
              dispute_reason: dispute.reason || null,
            })
            .eq("stripe_payment_intent_id", pi);
        }
        break;
      }

      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        const onboardingComplete = !!(account.charges_enabled && account.payouts_enabled);
        await supabase
          .from("profiles")
          .update({ stripe_onboarding_complete: onboardingComplete })
          .eq("stripe_account_id", account.id);
        break;
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Handler error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
});
