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

    const origin = req.headers.get("origin") || "http://localhost:3000";
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Look up existing account (use service role to bypass column-level RLS restrictions)
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("stripe_account_id, stripe_onboarding_complete")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) throw profileError;

    let accountId = profile?.stripe_account_id;

    if (!accountId) {
      // Create Express account
      const account = await stripe.accounts.create({
        type: "express",
        email: user.email,
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        business_profile: { name: "Spotsvault Provider" },
      });
      accountId = account.id;

      await admin.from("profiles").update({ stripe_account_id: accountId }).eq("id", user.id);
    }

    // Refresh onboarding status
    const account = await stripe.accounts.retrieve(accountId);
    const onboardingComplete = account.charges_enabled && account.payouts_enabled;

    if (onboardingComplete) {
      await admin
        .from("profiles")
        .update({ stripe_onboarding_complete: true })
        .eq("id", user.id);
      return new Response(
        JSON.stringify({ status: "complete", accountId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    // Create onboarding link
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/dashboard`,
      return_url: `${origin}/dashboard`,
      type: "account_onboarding",
    });

    return new Response(
      JSON.stringify({ url: link.url, accountId }),
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
