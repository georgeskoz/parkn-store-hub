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
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return new Response(
      JSON.stringify({ error: "Webhook secret not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let event: Stripe.Event;
  try {
    // Deno requires the async variant for signature verification
    event = await stripe.webhooks.constructEventAsync(body, sig, whSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Signature verification failed:", msg);
    return new Response(
      JSON.stringify({ error: `Invalid signature: ${msg}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
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
        const surgeMultiplier = session.metadata?.surge_multiplier
          ? parseFloat(session.metadata.surge_multiplier)
          : null;

        if (!bookingId) {
          console.warn("checkout.session.completed without booking_id metadata");
          break;
        }

        const payoutAmount = session.amount_total != null
          ? session.amount_total / 100
          : null;

        const update: Record<string, unknown> = {
          status: "confirmed",
          stripe_session_id: session.id,
        };
        if (typeof session.payment_intent === "string") {
          update.payment_intent_id = session.payment_intent;
        }
        if (surgeMultiplier != null) update.surge_multiplier = surgeMultiplier;
        if (payoutAmount != null) update.payout_amount = payoutAmount;

        const { error } = await supabase
          .from("bookings")
          .update(update)
          .eq("id", bookingId);

        if (error) {
          // Tolerate columns that may not exist yet (stripe_session_id, payout_amount)
          console.error("Booking update failed, retrying minimal:", error.message);
          const { error: e2 } = await supabase
            .from("bookings")
            .update({
              status: "confirmed",
              payment_intent_id:
                typeof session.payment_intent === "string"
                  ? session.payment_intent
                  : null,
            })
            .eq("id", bookingId);
          if (e2) throw e2;
        }

        console.log(`Booking ${bookingId} confirmed via checkout.session.completed`);
        break;
      }

      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const bookingId = pi.metadata?.booking_id;
        if (!bookingId) break;

        const { error } = await supabase
          .from("bookings")
          .update({ status: "confirmed", payment_intent_id: pi.id })
          .eq("id", bookingId);
        if (error) throw error;
        console.log(`Booking ${bookingId} confirmed via payment_intent.succeeded`);
        break;
      }

      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        const onboardingComplete = !!(account.charges_enabled && account.payouts_enabled);
        const { error } = await supabase
          .from("profiles")
          .update({ stripe_onboarding_complete: onboardingComplete })
          .eq("stripe_account_id", account.id);
        if (error) throw error;
        console.log(`Connect account ${account.id} onboarding=${onboardingComplete}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
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
