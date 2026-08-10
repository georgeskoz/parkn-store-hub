import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { recordUserAgreementIfMissing } from "@/lib/userAgreements";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const getSafeRelativeRedirect = (value: string | null) => {
    if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
    try {
      const parsed = new URL(value, window.location.origin);
      if (parsed.origin !== window.location.origin) return null;
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // Supabase JS auto-exchanges the OAuth code on page load.
      // Give it a tick, then check the session.
      const { data: { session } } = await supabase.auth.getSession();

      if (cancelled) return;

      if (!session?.user) {
        const safeRedirect = getSafeRelativeRedirect(new URLSearchParams(window.location.search).get("redirect"));
        navigate(safeRedirect ? `/auth?redirect=${encodeURIComponent(safeRedirect)}` : "/auth", { replace: true });
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

      const redirect = getSafeRelativeRedirect(new URLSearchParams(window.location.search).get("redirect"));
      if (redirect) {
        try {
          const raw = sessionStorage.getItem("pendingBookingState");
          if (raw) {
            const pending = JSON.parse(raw);
            sessionStorage.removeItem("pendingBookingState");
            navigate(pending.target || redirect, { replace: true, state: pending.state });
            return;
          }
        } catch {}
        navigate(redirect, { replace: true });
        return;
      }
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
        {t("auth.signingYouIn")}
      </div>
    </div>
  );
}
