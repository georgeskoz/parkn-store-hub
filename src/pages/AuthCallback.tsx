import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { recordUserAgreementIfMissing } from "@/lib/userAgreements";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // Supabase JS auto-exchanges the OAuth code on page load.
      // Give it a tick, then check the session.
      const { data: { session } } = await supabase.auth.getSession();

      if (cancelled) return;

      if (!session?.user) {
        navigate("/auth", { replace: true });
        return;
      }

      // Ensure a profile row exists for OAuth signups (in case the
      // handle_new_user trigger isn't wired for OAuth on this DB).
      try {
        const user = session.user;
        await supabase
          .from("profiles")
          .upsert(
            {
              id: user.id,
              display_name:
                user.user_metadata?.full_name ||
                user.user_metadata?.name ||
                user.email ||
                "",
              avatar_url: user.user_metadata?.avatar_url ?? null,
            },
            { onConflict: "id", ignoreDuplicates: true }
          );
      } catch {
        // Non-fatal — profile may already exist via trigger.
      }

      // Record Terms/Privacy acceptance on first OAuth login (no-op if already recorded).
      await recordUserAgreementIfMissing(session.user.id);

      navigate("/dashboard", { replace: true });
    };

    // Listen for SIGNED_IN in case the exchange hasn't completed yet.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") run();
    });

    run();

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        Signing you in…
      </div>
    </div>
  );
}
