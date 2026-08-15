import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
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

    const { extensionId, decision } = await req.json();
    if (!extensionId || !["accept", "decline"].includes(decision)) {
      throw new Error("Invalid payload");
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: ext } = await admin
      .from("booking_extensions")
      .select("*, bookings!inner(host_id, renter_id, listing_id, stripe_customer_id, stripe_payment_method_id, auto_release_at)")
      .eq("id", extensionId)
      .maybeSingle();
    if (!ext) throw new Error("Extension not found");
    const booking = (ext as any).bookings;
    if (booking.host_id !== user.id) throw new Error("Only provider can respond");
    if (ext.status !== "pending") throw new Error("Already responded");

    if (decision === "decline") {
      await admin
        .from("booking_extensions")
        .update({ status: "declined", responded_at: new Date().toISOString() })
        .eq("id", extensionId);
      return new Response(JSON.stringify({ status: "declined" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Accepted → charge off-session if we have payment method, otherwise return checkout URL
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });
    const amountCents = Math.round(Number(ext.extra_amount) * 100);

    if (booking.stripe_customer_id && booking.stripe_payment_method_id) {
      try {
        const pi = await stripe.paymentIntents.create({
          amount: amountCents,
          currency: "cad",
          customer: booking.stripe_customer_id,
          payment_method: booking.stripe_payment_method_id,
          off_session: true,
          confirm: true,
          description: `Extension +${ext.extra_hours}h for booking ${ext.booking_id}`,
          transfer_group: `booking_${ext.booking_id}`,
          metadata: { booking_id: ext.booking_id, extension_id: ext.id },
        });
        await admin
          .from("booking_extensions")
          .update({
            status: "paid",
            responded_at: new Date().toISOString(),
            paid_at: new Date().toISOString(),
            payment_intent_id: pi.id,
          })
          .eq("id", extensionId);
        // Bump booking end + auto_release
        const newRelease = new Date(
          new Date(ext.new_end_date).getTime() + 24 * 3600 * 1000,
        ).toISOString();
        await admin
          .from("bookings")
          .update({
            end_date: ext.new_end_date,
            auto_release_at: newRelease,
          })
          .eq("id", ext.booking_id);

        return new Response(JSON.stringify({ status: "paid", paymentIntent: pi.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await admin
          .from("booking_extensions")
          .update({ status: "accepted", responded_at: new Date().toISOString() })
          .eq("id", extensionId);
        return new Response(JSON.stringify({ status: "accepted", chargeError: msg }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    await admin
      .from("booking_extensions")
      .update({ status: "accepted", responded_at: new Date().toISOString() })
      .eq("id", extensionId);
    return new Response(JSON.stringify({ status: "accepted" }), {
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
