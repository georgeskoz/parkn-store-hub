import { useMemo } from "react";
import { loadConnectAndInitialize } from "@stripe/connect-js";
import { ConnectComponentsProvider, ConnectAccountOnboarding } from "@stripe/react-connect-js";
import { supabase } from "@/integrations/supabase/client";

interface StripeEmbeddedOnboardingProps {
  onExit: () => void;
}

// Renders Stripe's onboarding form inline (Connect embedded components)
// instead of redirecting the host out to a Stripe-hosted page -- this is
// what replaces the old window.location.href = accountLink.url flow for
// web. fetchClientSecret is called by Connect.js itself whenever it needs
// a session (initial mount, and again if a session expires mid-flow), so
// this hits the edge function on demand rather than once up front.
export default function StripeEmbeddedOnboarding({ onExit }: StripeEmbeddedOnboardingProps) {
  const connectInstance = useMemo(
    () =>
      loadConnectAndInitialize({
        publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string,
        fetchClientSecret: async () => {
          const { data, error } = await supabase.functions.invoke("create-connect-account-session", {
            body: {},
          });
          if (error) throw error;
          return data.clientSecret as string;
        },
      }),
    [],
  );

  return (
    <ConnectComponentsProvider connectInstance={connectInstance}>
      <ConnectAccountOnboarding onExit={onExit} />
    </ConnectComponentsProvider>
  );
}
