import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const sig = req.headers.get("stripe-signature") || "";
  const body = await req.text();

  // TODO: verify signature once STRIPE_WEBHOOK_SECRET is configured
  // const whSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  // let event: Stripe.Event;
  // try { event = stripe.webhooks.constructEvent(body, sig, whSecret!); }
  // catch (err) { return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400, headers: corsHeaders }); }

  let event: Stripe.Event;
  try {
    event = JSON.parse(body);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent;
    const bookingId = pi.metadata?.booking_id;
    if (!bookingId) {
      console.warn("No booking_id in payment_intent metadata");
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error } = await supabase
      .from("bookings")
      .update({ status: "confirmed", payment_intent_id: pi.id })
      .eq("id", bookingId);

    if (error) {
      console.error("Failed to confirm booking:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Booking ${bookingId} confirmed`);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
});
