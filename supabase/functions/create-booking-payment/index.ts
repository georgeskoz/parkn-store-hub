import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PLATFORM_COMMISSION_PERCENT = 10;

function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr).getDay();
}

function parseTimeToMinutes(t: string | null): number | null {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabase.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("Unauthorized");

    const body = await req.json();
    const {
      listingId,
      title,
      address,
      startDate,
      endDate,
      rate,
      unitPrice,
      units,
      listingType,
    } = body;

    if (!listingId || !title || !startDate || !endDate || !rate || !units) {
      throw new Error("Missing booking details");
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Get listing details for surge pricing + provider
    const { data: listing } = await supabase
      .from("listings")
      .select("city, category, user_id")
      .eq("id", listingId)
      .single();
    if (!listing) throw new Error("Listing not found");

    // Check surge pricing
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const currentDow = now.getDay();

    const { data: surgeRules } = await supabase
      .from("surge_pricing")
      .select("surge_multiplier, start_time, end_time, days_of_week")
      .eq("city", listing.city)
      .eq("category", listing.category)
      .eq("is_active", true);

    let surgeMultiplier = 1;
    for (const rule of surgeRules || []) {
      const days = rule.days_of_week as number[] | null;
      const startMin = parseTimeToMinutes(rule.start_time);
      const endMin = parseTimeToMinutes(rule.end_time);

      const dayMatch = !days || days.includes(currentDow);
      const timeMatch =
        startMin === null || endMin === null ||
        (startMin <= endMin
          ? currentMinutes >= startMin && currentMinutes <= endMin
          : currentMinutes >= startMin || currentMinutes <= endMin);

      if (dayMatch && timeMatch && rule.surge_multiplier > surgeMultiplier) {
        surgeMultiplier = rule.surge_multiplier;
      }
    }

    const baseSubtotal = +unitPrice * +units;
    const subtotal = +(baseSubtotal * surgeMultiplier).toFixed(2);
    const gst = +(subtotal * 0.05).toFixed(2);
    const qst = +(subtotal * 0.09975).toFixed(2);
    const total = +(subtotal + gst + qst).toFixed(2);

    const totalCents = Math.round(total * 100);
    const platformFeeCents = Math.round(totalCents * PLATFORM_COMMISSION_PERCENT / 100);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Create pending booking
    const { data: booking, error: bookingError } = await admin
      .from("bookings")
      .insert({
        listing_id: listingId,
        seeker_id: user.id,
        provider_id: listing.user_id,
        start_date: startDate,
        end_date: endDate,
        status: "pending",
        total_amount: total,
        commission_rate: PLATFORM_COMMISSION_PERCENT,
        commission_amount: platformFeeCents / 100,
        category: listing.category,
        city: listing.city,
      })
      .select("id")
      .single();

    if (bookingError) throw new Error(bookingError.message);

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) customerId = customers.data[0].id;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "cad",
            product_data: {
              name: title,
              description: `${listingType} booking: ${address} (${rate} rate × ${units})`,
            },
            unit_amount: totalCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      metadata: {
        booking_id: booking.id,
        listing_type: listingType,
        listing_id: listingId,
        start_date: startDate,
        end_date: endDate,
        rate,
        units: String(units),
        subtotal: String(subtotal),
        gst: String(gst),
        qst: String(qst),
        surge_multiplier: String(surgeMultiplier),
        platform_fee_cents: String(platformFeeCents),
        provider_payout_cents: String(totalCents - platformFeeCents),
        user_id: user.id,
      },
      success_url: `${origin}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/booking/confirm`,
    });

    return new Response(
      JSON.stringify({ url: session.url, surgeMultiplier, subtotal, gst, qst, total }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
