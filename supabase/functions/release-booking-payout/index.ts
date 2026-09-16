import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// RETIRED (see admin/src/lib/payout-executor.ts). This function used to be
// triggered hourly by the 'release-booking-payout-hourly' pg_cron job and
// used a hardcoded 10% commission that ignored both the real per-booking
// commission_rate and the admin-configurable platform_settings.commission_rate,
// and could double-pay a host alongside admin's own payout-executor.ts path.
// Payouts now go exclusively through admin's payout-executor.ts (manually via
// the "Trigger Payout" button, and automatically via
// admin/src/app/api/payments/scheduled-release/route.ts on its own pg_cron
// job). The 'release-booking-payout-hourly' cron job must be unscheduled
// (see the migration that retires it) so this stub is never actually
// invoked in production; it returns 410 rather than 404 in case anything
// still calls it during the transition, so the failure is self-explanatory
// in logs instead of looking like a missing/misconfigured function.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  return new Response(
    JSON.stringify({
      error:
        "release-booking-payout is retired. Payouts now go through admin's payout-executor exclusively.",
    }),
    {
      status: 410,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
