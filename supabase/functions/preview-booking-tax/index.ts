import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Ported verbatim from create-booking-payment's normalizeCountry.
function normalizeCountry(country?: string | null): "CA" | "US" | "OTHER" {
  const c = (country ?? "").trim().toLowerCase();
  if (c === "ca" || c === "can" || c === "canada") return "CA";
  if (c === "us" || c === "usa" || c === "united states" || c === "united states of america") {
    return "US";
  }
  return "OTHER";
}

// CA fallback only -- see create-booking-payment for the full rationale.
const GST_RATE = 0.05;

function round2(amount: number): number {
  return Math.round(amount * 100) / 100;
}

// Ported verbatim from create-booking-payment's CA_PROVINCE_NAME_TO_CODE /
// resolveCaRegionCode.
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

// Ported verbatim from create-booking-payment's calculateBookingTax. Kept in
// sync manually -- no cross-function module system between separate Deno
// edge functions. This function exists solely to let pre-checkout previews
// (ListingDetail, BookingConfirmation) show real tax_rates-driven amounts:
// the client can't read tax_rates directly (RLS blocks anon/authenticated,
// confirmed live against the 22-row table), and the actual charge is always
// computed authoritatively again, server-side, in create-booking-payment --
// so this endpoint is display-only and safe to keep public.
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

// Intentionally public (verify_jwt = false, no internal role check either):
// display-only preview, no side effects, no privileged data returned beyond
// the tax rate itself. Trusts client-supplied country/province rather than
// re-fetching the listing row -- a manipulated preview has zero financial
// impact since create-booking-payment recomputes tax from the real listing
// row server-side before ever creating a Stripe session.
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { country, province } = body;
    const subtotal = Number(body.subtotal);
    if (!Number.isFinite(subtotal) || subtotal < 0) {
      throw new Error("Invalid subtotal");
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const tax = await calculateBookingTax(admin, subtotal, { country, province });

    return new Response(JSON.stringify(tax), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
