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
    const { data } = await supabase.auth.getUser(token);
    const user = data.user;
    if (!user) throw new Error("Unauthorized");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Same account-creation logic as create-stripe-connect-link's --
    // duplicated rather than shared, for the same reason splitCents is
    // duplicated between create-booking-payment/create-payment-intent:
    // this and that function are separate Deno edge functions with no
    // cross-function module system between them. create-stripe-connect-link
    // is left doing the hosted-redirect (Account Link) flow for mobile;
    // this one exists so web can embed onboarding inline instead of
    // bouncing the host out to a Stripe-hosted page.
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
        email: user.email,
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        business_profile: { name: "Spotsvault Provider" },
      });
      accountId = account.id;
      await admin.from("profiles").update({ stripe_account_id: accountId }).eq("id", user.id);
    }

    // Account Session is the embedded-components counterpart to an Account
    // Link -- a short-lived client_secret the frontend hands to Connect.js,
    // instead of a URL to redirect to. account_onboarding is the only
    // component enabled here; account_management (for editing bank details
    // after the fact) can be added the same way later if wanted.
    const session = await stripe.accountSessions.create({
      account: accountId,
      components: {
        account_onboarding: { enabled: true },
      },
    });

    return new Response(
      JSON.stringify({ clientSecret: session.client_secret, accountId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    console.error("CONNECT_ACCOUNT_SESSION_ERROR:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
