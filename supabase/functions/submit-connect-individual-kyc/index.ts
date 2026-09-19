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
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  );
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: authData } = await supabase.auth.getUser(token);
    const user = authData.user;
    if (!user) throw new Error("Unauthorized");

    const body = await req.json();
    const {
      firstName,
      lastName,
      dobDay,
      dobMonth,
      dobYear,
      email,
      phone,
      addressLine1,
      addressLine2,
      city,
      province,
      postalCode,
      // The host's SIN. Forwarded straight into the accounts.update() call
      // below and never written to our database or logged anywhere --
      // this in-flight request is the only place it exists outside
      // Stripe's own systems. See the comment above that call for why
      // this field, specifically, can't be tokenized client-side first
      // the way the bank account and ID document already are.
      idNumber,
      documentFrontFileId,
      documentBackFileId,
      bankToken,
    } = body ?? {};

    if (!firstName || !lastName || !dobDay || !dobMonth || !dobYear) {
      throw new Error("Missing required individual fields");
    }
    if (!addressLine1 || !city || !province || !postalCode) {
      throw new Error("Missing required address fields");
    }
    if (!bankToken) throw new Error("Missing bank account token");
    if (!documentFrontFileId) throw new Error("Missing identity document");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Same account-creation-or-reuse logic as create-stripe-connect-link /
    // create-connect-account-session -- duplicated rather than shared for
    // the same reason those two duplicate it from each other: separate
    // Deno edge functions, no cross-function module system between them.
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) throw profileError;

    let accountId = profile?.stripe_account_id;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "CA",
        email: user.email,
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        business_profile: { name: "Spotsvault Provider" },
      });
      accountId = account.id;
      await admin.from("profiles").update({ stripe_account_id: accountId }).eq("id", user.id);
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "0.0.0.0";

    // id_number (the host's SIN) is forwarded directly in this single
    // update call and never touches our database, a log line, or any
    // other storage. Unlike the bank account (tokenized client-side into
    // bankToken) and the ID photos (uploaded client-side to files.stripe.com,
    // referenced here only by file ID), Stripe's PII-token endpoint for
    // id_number requires a secret key -- confirmed directly against
    // Stripe's docs -- so there's no equivalent way to keep the raw SIN
    // off this server entirely. This request is as close as it gets: it's
    // used once, immediately, and returned to nothing but Stripe.
    const updated = await stripe.accounts.update(accountId, {
      business_type: "individual",
      individual: {
        first_name: firstName,
        last_name: lastName,
        dob: { day: Number(dobDay), month: Number(dobMonth), year: Number(dobYear) },
        email: email || user.email,
        phone: phone || undefined,
        id_number: idNumber || undefined,
        address: {
          line1: addressLine1,
          line2: addressLine2 || undefined,
          city,
          state: province,
          postal_code: postalCode,
          country: "CA",
        },
        verification: {
          document: {
            front: documentFrontFileId,
            back: documentBackFileId || undefined,
          },
        },
      },
      external_account: bankToken,
      tos_acceptance: {
        date: Math.floor(Date.now() / 1000),
        ip,
      },
    });

    const bankAccount = updated.external_accounts?.data.find(
      (ext): ext is Stripe.BankAccount => ext.object === "bank_account",
    );
    const bankLast4 = bankAccount?.last4 ?? null;
    const onboardingComplete = !!(updated.charges_enabled && updated.payouts_enabled);

    await admin
      .from("profiles")
      .update({
        stripe_onboarding_complete: onboardingComplete,
        ...(bankLast4 ? { stripe_bank_last4: bankLast4 } : {}),
      })
      .eq("id", user.id);

    return new Response(
      JSON.stringify({
        status: onboardingComplete ? "complete" : "submitted",
        bankLast4,
        // Stripe's own dynamic requirements engine is the source of truth
        // for whether this fixed form actually covered everything a given
        // account needs (a different capability mix, a flagged document,
        // enhanced verification, etc. can all add fields this form doesn't
        // ask for). The mobile client uses a non-empty list here to offer
        // the Stripe-hosted fallback rather than silently claiming success.
        stillDue: updated.requirements?.currently_due ?? [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    console.error("CONNECT_INDIVIDUAL_KYC_ERROR:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
