import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FALLBACK_COMMISSION_RATE = 0.10; // 10% — matches admin's getCommissionRate() fallback
const AUTO_RELEASE_HOURS = 24;

// Ported from create-payment-intent's own port of
// admin/src/lib/commission.ts#getCommissionRate -- same key/value read, same
// fallback. Kept as a local copy rather than a shared import since these are
// separate Deno edge functions with no cross-repo module system between them.
async function getCommissionRate(admin: ReturnType<typeof createClient>): Promise<number> {
  const { data, error } = await admin
    .from("platform_settings")
    .select("value")
    .eq("key", "commission_rate")
    .single();

  if (error || !data?.value) return FALLBACK_COMMISSION_RATE;

  const rate = parseFloat(data.value as string) / 100;
  if (!Number.isFinite(rate) || rate <= 0 || rate >= 1) return FALLBACK_COMMISSION_RATE;
  return rate;
}

// Ported verbatim from create-payment-intent's normalizeCountry/
// deriveCurrency -- same recognized values, same behavior. Kept as a local
// copy for the same cross-repo/cross-runtime reason as getCommissionRate.
function normalizeCountry(country?: string | null): "CA" | "US" | "OTHER" {
  const c = (country ?? "").trim().toLowerCase();
  if (c === "ca" || c === "can" || c === "canada") return "CA";
  if (c === "us" || c === "usa" || c === "united states" || c === "united states of america") {
    return "US";
  }
  return "OTHER";
}

// Currency follows the listing's country, not which app was used to book --
// a renter in NYC booking a Toronto listing gets charged CAD (the host's
// currency), not CAD-by-coincidence just because they're on web. Falls back
// to CAD for missing/unrecognized country (most current listings have none
// set at all; explicit product decision to allow the booking rather than
// block it).
function deriveCurrency(country?: string | null): "cad" | "usd" {
  return normalizeCountry(country) === "US" ? "usd" : "cad";
}

// CA fallback only -- used when a listing's province can't be matched to a
// tax_rates row (missing/unrecognized data). Canada always levies GST
// federally regardless of province, so this preserves that floor rather than
// charging $0 tax on an unmatched region. Every real CA province/territory
// row exists in tax_rates today (verified live, 13/13), so this only fires
// on bad/unexpected data.
const GST_RATE = 0.05;

function round2(amount: number): number {
  return Math.round(amount * 100) / 100;
}

// tax_rates.region_code is the 2-letter province code (AB, BC, ..., YT).
// listings.province is free text and, confirmed live, inconsistently
// formatted -- one real listing has "QC", another has "Ontario". This maps
// full province/territory names to their code; codes already in this shape
// pass through the shortcut in resolveCaRegionCode below.
const CA_PROVINCE_NAME_TO_CODE: Record<string, string> = {
  "alberta": "AB",
  "british columbia": "BC",
  "manitoba": "MB",
  "new brunswick": "NB",
  "newfoundland": "NL",
  "newfoundland and labrador": "NL",
  "nova scotia": "NS",
  "northwest territories": "NT",
  "nunavut": "NU",
  "ontario": "ON",
  "prince edward island": "PE",
  "quebec": "QC",
  "saskatchewan": "SK",
  "yukon": "YT",
};
const CA_PROVINCE_CODES = new Set(Object.values(CA_PROVINCE_NAME_TO_CODE));

function resolveCaRegionCode(province?: string | null): string | null {
  const p = (province ?? "").trim().toLowerCase().replace(/é/g, "e");
  if (!p) return null;
  const asCode = p.toUpperCase();
  if (CA_PROVINCE_CODES.has(asCode)) return asCode;
  return CA_PROVINCE_NAME_TO_CODE[p] ?? null;
}

type TaxLineItem = { name: string; rate: number; amount: number };
type TaxRateComponent = { name: string; rate: number };

// Table-driven for both CA and US: one lookup by (country, region_code),
// expanding tax_rates.components into one line item per entry. This is the
// same mechanism tax_rates already uses to represent Quebec's GST+QST as two
// visible line items under a single row (components: [{GST,0.05},
// {QST,0.09975}]) vs. e.g. Ontario's single HST component -- confirmed live
// against all 13 CA rows and all 9 US rows, no special-casing needed in code
// for Quebec (or NY, which already has two US components: State Tax + Local
// Tax). Falls back to a synthetic single component from tax_name/rate if a
// row exists but components is empty/null (defensive, not expected to fire
// against current live data).
async function calculateBookingTax(
  admin: ReturnType<typeof createClient>,
  subtotal: number,
  listing: { country?: string | null; province?: string | null },
): Promise<{ lineItems: TaxLineItem[]; taxTotal: number }> {
  const country = normalizeCountry(listing.country);
  const lineItems: TaxLineItem[] = [];

  if (country === "CA" || country === "US") {
    const regionCode = country === "CA"
      ? resolveCaRegionCode(listing.province)
      : (listing.province ?? "").trim().toUpperCase() || null;

    if (regionCode) {
      const { data } = await admin
        .from("tax_rates")
        .select("tax_name, rate, components")
        .eq("country", country)
        .eq("region_code", regionCode)
        .eq("is_active", true)
        .maybeSingle();

      if (data) {
        const components: TaxRateComponent[] =
          Array.isArray(data.components) && data.components.length > 0
            ? data.components as TaxRateComponent[]
            : [{ name: data.tax_name as string, rate: Number(data.rate) }];
        for (const c of components) {
          const rate = Number(c.rate) || 0;
          if (rate > 0) {
            lineItems.push({ name: c.name, rate, amount: round2(subtotal * rate) });
          }
        }
      }
    }

    if (country === "CA" && lineItems.length === 0) {
      lineItems.push({ name: "GST", rate: GST_RATE, amount: round2(subtotal * GST_RATE) });
    }
  }

  const taxTotal = round2(lineItems.reduce((sum, item) => sum + item.amount, 0));
  return { lineItems, taxTotal };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Moved inside the try/catch: this was the one piece of code in the
    // whole function capable of producing a raw, uncaught crash with no
    // error log (everything else already lived inside this block).
    // Defensive regardless of root cause -- but per current investigation,
    // do NOT swap SUPABASE_ANON_KEY for SUPABASE_PUBLISHABLE_KEYS as a
    // same-shape env var rename. Confirmed against current Supabase docs
    // and the exact GitHub issue describing this migration: legacy keys
    // stay populated (not undefined) through the deprecation window, and
    // the new var holds a JSON object keyed by name, not a plain string --
    // a same-shape swap would be wrong on both the "is this the bug" and
    // the "is this the right replacement" fronts. Get real Logs tab output
    // from a live attempt before changing this further.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );

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
      intake,
    } = body;

    if (!listingId || !title || !startDate || !endDate || !rate || !units) {
      throw new Error("Missing booking details");
    }

    // Normalize intake fields (safe against missing/invalid payload)
    const intakeFields: Record<string, unknown> = {};
    if (intake && typeof intake === "object") {
      if (intake.kind === "parking") {
        intakeFields.vehicle_plate = String(intake.vehicle_plate || "").toUpperCase().slice(0, 8);
        intakeFields.vehicle_type = String(intake.vehicle_type || "").slice(0, 40);
        intakeFields.vehicle_make = String(intake.vehicle_make || "").slice(0, 80);
        intakeFields.vehicle_colour = String(intake.vehicle_colour || "").slice(0, 40);
        // Optional -- unlike the other vehicle/driver fields, a renter can
        // leave this blank. Sent as null (not ""), matching the nullable
        // column and the dropoff_date/dropoff_time null convention below.
        intakeFields.drivers_license = intake.drivers_license
          ? String(intake.drivers_license).slice(0, 32)
          : null;
        intakeFields.license_province_state = String(intake.license_province_state || "").slice(0, 16);
      } else if (intake.kind === "storage") {
        intakeFields.storage_items = intake.storage_items && typeof intake.storage_items === "object"
          ? intake.storage_items
          : {};
        intakeFields.storage_notes = String(intake.storage_notes || "").slice(0, 500);
        intakeFields.storage_size = String(intake.storage_size || "").slice(0, 20);
        intakeFields.dropoff_date = intake.dropoff_date || null;
        intakeFields.dropoff_time = intake.dropoff_time || null;
      }
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
      // hourly/daily/weekly/monthly/seasonal (bare names) don't exist on
      // this table in production -- this is the actual cause of the crash,
      // caught live via the BOOKING_PAYMENT_ERROR log: "column
      // listings.hourly does not exist". Only the price_ prefixed columns
      // are real; individually verified against prod, including
      // confirming price_seasonal *also* doesn't exist (there's no
      // seasonal-pricing column under any name right now -- matches
      // ListingFormTypes.ts's form.seasonal, which the wizard UI never
      // actually sets either, so this isn't a regression, just no longer
      // crashing the entire booking flow along with an already-dead field).
      .select("city, category, country, province, host_id, user_id, price_hourly, price_daily, price_weekly, price_monthly")
      .eq("id", listingId)
      .maybeSingle();
    if (listingError) throw new Error(`Listing lookup failed: ${listingError.message}`);
    if (!listing) throw new Error("Listing not found");

    const currency = deriveCurrency((listing as any).country);

    const l = listing as any;
    const rateMap: Record<string, number | null> = {
      hourly: l.price_hourly ?? null,
      daily: l.price_daily ?? null,
      weekly: l.price_weekly ?? null,
      monthly: l.price_monthly ?? null,
      seasonal: null,
    };
    const unitPrice = rateMap[rate];
    if (unitPrice == null || Number(unitPrice) <= 0) {
      throw new Error("Selected rate is not available for this listing");
    }
    const providerId = l.user_id ?? l.host_id;
    if (!providerId) throw new Error("Listing has no provider");

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

    const listingLocation = { country: (listing as any).country, province: (listing as any).province };
    const tax = await calculateBookingTax(admin, subtotal, listingLocation);
    const total = +(subtotal + tax.taxTotal).toFixed(2);

    // originalTotal is the pre-surge comparison total shown in the UI --
    // needs the same location-aware tax, not the old flat-14.975% multiplier
    // (which baked in the same always-Quebec-rate assumption as `total` used
    // to have).
    const baseTax = await calculateBookingTax(admin, baseSubtotal, listingLocation);
    const originalTotal = +(baseSubtotal + baseTax.taxTotal).toFixed(2);

    const commissionRate = await getCommissionRate(admin);
    const totalCents = Math.round(total * 100);
    const platformFeeCents = Math.round(totalCents * commissionRate);

    const autoReleaseAt = new Date(
      new Date(endDate).getTime() + AUTO_RELEASE_HOURS * 3600 * 1000,
    ).toISOString();

    // Prevent double-booking: reject if any active booking overlaps this range.
    const { data: overlaps, error: overlapErr } = await admin
      .from("bookings")
      .select("id")
      .eq("listing_id", listingId)
      .in("escrow_status", ["pending", "held", "released", "completed"])
      .neq("status", "cancelled")
      .lt("start_date", endDate)
      .gt("end_date", startDate)
      .limit(1);
    if (overlapErr) throw new Error(`Availability check failed: ${overlapErr.message}`);
    if (overlaps && overlaps.length > 0) {
      throw new Error("This time slot was just booked by someone else. Please pick another time.");
    }

    const { data: booking, error: bookingError } = await admin
      .from("bookings")
      // seeker_id/provider_id/commission_amount don't exist on this table in
      // production -- renter_id/host_id/platform_fee are the real columns
      // (each individually verified directly against prod). Every other
      // field here was verified to exist as-is.
      .insert({
        listing_id: listingId,
        renter_id: user.id,
        host_id: providerId,
        start_date: startDate,
        end_date: endDate,
        // Mobile writes this on every booking it creates (same "hourly" |
        // "daily" | "weekly" | "monthly" vocabulary as `rate` here) and reads
        // it back for display (bookings.tsx's duration badge) -- this insert
        // never set it, leaving it null on every web-originated booking and
        // producing a literal "hostCreate.null" badge on the renter's
        // mobile bookings list for exactly those rows.
        duration_type: rate,
        status: "pending",
        escrow_status: "pending",
        auto_release_at: autoReleaseAt,
        currency,
        total_amount: total,
        original_amount: originalTotal,
        surge_multiplier: surgeMultiplier,
        // commissionRate is a decimal (e.g. 0.10) -- bookings.commission_rate
        // is stored as a percent (e.g. 10), same as this function always
        // wrote and what booking-detail-client.tsx's commissionRateLabel()
        // (`${booking.commission_rate}%`) expects. Converting back here
        // instead of storing the raw decimal, which would silently render
        // as "0.1%" instead of "10%".
        commission_rate: commissionRate * 100,
        platform_fee: platformFeeCents / 100,
        category: listing.category,
        city: listing.city,
        ...intakeFields,
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
      // Stripe defaults this to 24h. An abandoned session blocks this
      // listing's dates until it expires, so keep the window short --
      // stripe-webhook's checkout.session.expired handler frees the
      // booking as soon as this fires. Stripe's minimum is 30 minutes.
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
      line_items: [
        {
          price_data: {
            currency,
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
        tax_line_items: JSON.stringify(tax.lineItems),
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
        taxLineItems: tax.lineItems,
        total,
        originalTotal,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    // Log the raw error, not just .message -- a non-Error throw (a plain
    // object, a Postgrest/Stripe error shape, etc.) can carry useful
    // structure that .message would discard entirely.
    console.error("BOOKING_PAYMENT_ERROR:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
