import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

// This function is the pre-checkout tax PREVIEW shown on ListingDetail.tsx
// and BookingConfirmation.tsx (its surge-repricing branch) -- purely
// read-only, no booking is created or charged here. It is listed in
// config.toml (verify_jwt = false) and was invoked from both of those
// pages already, but the function itself was never actually written to
// this functions/ directory, so every call 404'd. supabase.functions.invoke()
// on both callers wraps the call in try/catch and silently falls back to
// {lineItems: [], taxTotal: 0} on any failure -- so instead of an error,
// renters just saw a booking summary with no tax line at all, and a total
// that (wrongly, from their POV) matched subtotal + platform fee exactly.
// The *real* charge, taken by create-booking-payment at actual checkout
// time, already computes and charges tax correctly (and persists it to
// bookings.tax_amount/tax_breakdown) -- so tax was never actually missing
// from anyone's bill, only from this preview screen shown before paying.
//
// calculateBookingTax/normalizeCountry/resolveCaRegionCode below are
// ported verbatim from create-booking-payment/index.ts so this preview can
// never disagree with what actually gets charged. Kept as a local copy
// (not a shared import) for the same cross-function/cross-Deno-runtime
// reason every other port in this functions/ directory already documents.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function normalizeCountry(country?: string | null): "CA" | "US" | "OTHER" {
  const c = (country ?? "").trim().toLowerCase();
  if (c === "ca" || c === "can" || c === "canada") return "CA";
  if (c === "us" || c === "usa" || c === "united states" || c === "united states of america") {
    return "US";
  }
  return "OTHER";
}

// CA fallback only -- used when a listing's province can't be matched to a
// tax_rates row (missing/unrecognized data). Canada always levies GST
// federally regardless of province, so this preserves that floor rather than
// previewing $0 tax on an unmatched region.
const GST_RATE = 0.05;

function round2(amount: number): number {
  return Math.round(amount * 100) / 100;
}

// tax_rates.region_code is the 2-letter province code (AB, BC, ..., YT).
// listings.province is free text and inconsistently formatted (e.g. "QC" vs
// "Ontario") -- this maps full province/territory names to their code;
// codes already in this shape pass through the shortcut below.
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
    const body = await req.json();
    const { country, province, subtotal } = body;

    const sub = Number(subtotal);
    if (!Number.isFinite(sub) || sub < 0) {
      throw new Error("Invalid subtotal");
    }

    // service_role, not the caller's own session -- this is a read-only
    // preview against tax_rates (a small, non-sensitive reference table),
    // and the caller may not even be signed in yet (ListingDetail.tsx runs
    // this preview for signed-out visitors too). No RLS policy needs to
    // exist on tax_rates for anon/authenticated for this to work.
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const result = await calculateBookingTax(admin, sub, { country, province });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("PREVIEW_BOOKING_TAX_ERROR:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
