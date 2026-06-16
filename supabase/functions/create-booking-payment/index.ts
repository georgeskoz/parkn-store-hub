import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PLATFORM_COMMISSION_PERCENT = 10;
const AUTO_RELEASE_HOURS = 24;

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
      units,
      listingType,
    } = body;

    if (!listingId || !title || !startDate || !endDate || !rate || !units) {
      throw new Error("Missing booking details");
    }

    const allowedRates = ["hourly", "daily", "weekly", "monthly", "seasonal"];
    if (!allowedRates.includes(rate)) throw new Error("Invalid rate");
    const unitsNum = Number(units);
    if (!Number.isFinite(unitsNum) || unitsNum <= 0 || unitsNum > 10000) {
      throw new Error("Invalid units");
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: listing, error: listingError } = await admin
      .from("listings")
      .select("city, category, host_id, hourly, daily, weekly, monthly, seasonal")
      .eq("id", listingId)
      .maybeSingle();
    if (listingError) throw new Error(`Listing lookup failed: ${listingError.message}`);
    if (!listing) throw new Error("Listing not found");

    const rateMap: Record<string, number | null> = {
      hourly: (listing as any).hourly ?? null,
      daily: (listing as any).daily ?? null,
      weekly: (listing as any).weekly ?? null,
      monthly: (listing as any).monthly ?? null,
      seasonal: (listing as any).seasonal ?? null,
    };
    const unitPrice = rateMap[rate];
    if (unitPrice == null || Number(unitPrice) <= 0) {
      throw new Error("Selected rate is not available for this listing");
    }

    const nowIso = new Date().toISOString();
    const { data: surgeRules } = await admin
      .from("surge_pricing")
      .select("id, label, surge_multiplier, start_at, end_at, category")
      .eq("city", listing.city)
      .eq("is_active", true)
      .or(`category.eq.${listing.category},category.eq.all`)
      .lte("start_at", nowIso)
      .gte("end_at", nowIso);

    let surgeMultiplier = 1;
    let surgeLabel: string | null = null;
    let surgeRuleId: string | null = null;
    for (const rule of surgeRules || []) {
      if (Number(rule.surge_multiplier) > surgeMultiplier) {
        surgeMultiplier = Number(rule.surge_multiplier);
        surgeLabel = rule.label;
        surgeRuleId = rule.id;
      }
    }

    const baseSubtotal = +(+unitPrice * unitsNum).toFixed(2);
    const subtotal = +(baseSubtotal * surgeMultiplier).toFixed(2);
    const gst = +(subtotal * 0.05).toFixed(2);
    const qst = +(subtotal * 0.09975).toFixed(2);
    const total = +(subtotal + gst + qst).toFixed(2);
    const originalTotal = +(baseSubtotal * 1.14975).toFixed(2);

    const totalCents = Math.round(total * 100);
    const platformFeeCents = Math.round(
      totalCents * PLATFORM_COMMISSION_PERCENT / 100,
    );

    const autoReleaseAt = new Date(
      new Date(endDate).getTime() + AUTO_RELEASE_HOURS * 3600 * 1000,
    ).toISOString();

    const { data: booking, error: bookingError } = await admin
      .from("bookings")
      .insert({
        listing_id: listingId,
        seeker_id: user.id,
        provider_id: listing.user_id,
        start_at: startDate,
        end_at: endDate,
        status: "pending",
        escrow_status: "pending",
        auto_release_at: autoReleaseAt,
        total_price: total,
        original_amount: originalTotal,
        surge_multiplier: surgeMultiplier,
        commission_rate: PLATFORM_COMMISSION_PERCENT,
        commission_amount: platformFeeCents / 100,
        category: listing.category,
        city: listing.city,
      })
      .select("id")
      .single();
    if (bookingError) throw new Error(bookingError.message);

    // Reuse or create Stripe customer (needed for off_session overdue charges)
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId = customers.data[0]?.id;
    if (!customerId) {
      const c = await stripe.customers.create({ email: user.email });
      customerId = c.id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: "cad",
            product_data: {
              name: title,
              description: `${listingType} booking: ${address} (${rate} × ${units})${surgeLabel ? ` • Surge: ${surgeLabel}` : ""}`,
            },
            unit_amount: totalCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      payment_intent_data: {
        // Funds land on Spotsvault platform account (escrow). Transfer is created
        // later by release-booking-payout. transfer_group lets us tie transfers
        // back to this booking.
        transfer_group: `booking_${booking.id}`,
        setup_future_usage: "off_session",
        metadata: {
          booking_id: booking.id,
        },
      },
      metadata: {
        booking_id: booking.id,
        listing_id: listingId,
        listing_type: listingType,
        start_at: startDate,
        end_at: endDate,
        rate,
        units: String(units),
        subtotal: String(subtotal),
        gst: String(gst),
        qst: String(qst),
        surge_multiplier: String(surgeMultiplier),
        surge_label: surgeLabel || "",
        surge_rule_id: surgeRuleId || "",
        original_total: String(originalTotal),
        platform_fee_cents: String(platformFeeCents),
        provider_payout_cents: String(totalCents - platformFeeCents),
        user_id: user.id,
      },
      success_url: `${origin}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/booking/confirm`,
    });

    // Persist the customer + session right away so off-session overdue charges
    // can run even if the webhook is delayed.
    await admin
      .from("bookings")
      .update({
        stripe_customer_id: customerId,
        stripe_session_id: session.id,
      })
      .eq("id", booking.id);

    return new Response(
      JSON.stringify({
        url: session.url,
        surgeMultiplier,
        surgeLabel,
        subtotal,
        gst,
        qst,
        total,
        originalTotal,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
