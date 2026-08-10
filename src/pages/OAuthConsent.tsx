import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Car, CheckCircle2, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type OAuthClientDetails = {
  name?: string;
  uri?: string;
  logo_uri?: string;
};

type OAuthDetails = {
  authorization_id?: string;
  redirect_uri?: string;
  redirect_url?: string;
  redirect_to?: string;
  scope?: string;
  client?: OAuthClientDetails;
  user?: { email?: string };
};

const oauthApi = () => (supabase.auth as any).oauth as {
  getAuthorizationDetails: (authorizationId: string) => Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
  approveAuthorization: (authorizationId: string) => Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
  denyAuthorization: (authorizationId: string) => Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
};

const getRedirectTarget = (data: OAuthDetails | null | undefined) => data?.redirect_url ?? data?.redirect_to ?? null;

export default function OAuthConsent() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<OAuthDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const scopeLabel = (scope: string) => {
    switch (scope) {
      case "openid":
        return t("oauthConsent.scopeIdentity");
      case "email":
        return t("oauthConsent.scopeEmail");
      case "profile":
        return t("oauthConsent.scopeProfile");
      default:
        return t("oauthConsent.scopeOther", { scope });
    }
  };

  const requestedScopes = useMemo(
    () => (details?.scope ?? "openid email profile").split(/\s+/).filter(Boolean),
    [details?.scope],
  );

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!authorizationId) {
        setError(t("oauthConsent.missingRequest"));
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        const next = `${window.location.pathname}${window.location.search}`;
        window.location.href = `/auth?next=${encodeURIComponent(next)}`;
        return;
      }

      const { data, error: detailsError } = await oauthApi().getAuthorizationDetails(authorizationId);
      if (!active) return;

      if (detailsError) {
        setError(detailsError.message);
        return;
      }

      const redirect = getRedirectTarget(data);
      if (redirect && !data?.client) {
        window.location.href = redirect;
        return;
      }

      setDetails(data);
    };

    load();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorizationId]);

  const decide = async (approve: boolean) => {
    setBusy(true);
    setError(null);

    const { data, error: decisionError } = approve
      ? await oauthApi().approveAuthorization(authorizationId)
      : await oauthApi().denyAuthorization(authorizationId);

    if (decisionError) {
      setBusy(false);
      setError(decisionError.message);
      return;
    }

    const redirect = getRedirectTarget(data);
    if (!redirect) {
      setBusy(false);
      setError(t("oauthConsent.noRedirect"));
      return;
    }

    window.location.href = redirect;
  };

  const clientName = details?.client?.name ?? t("oauthConsent.thisApp");

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-xl card-shadow">
        <CardHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg hero-gradient flex items-center justify-center shrink-0">
              <Car className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl">{t("oauthConsent.connectTitle", { clientName })}</CardTitle>
              <CardDescription>{t("oauthConsent.connectDescription", { clientName })}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              {t("oauthConsent.loadError", { error })}
            </div>
          )}

          {!error && !details && (
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              {t("oauthConsent.loading")}
            </div>
          )}

          {details && (
            <>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3 rounded-md border border-border bg-muted/40 p-3">
                  <ShieldCheck className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">
                      {t("oauthConsent.signedInAs", { email: details.user?.email ?? t("oauthConsent.yourAccount") })}
                    </p>
                    <p className="text-muted-foreground">{t("oauthConsent.permissionsNote")}</p>
                  </div>
                </div>

                {details.redirect_uri && (
                  <div className="rounded-md border border-border p-3">
                    <p className="font-medium text-foreground">{t("oauthConsent.clientRedirect")}</p>
                    <p className="break-all text-muted-foreground">{details.redirect_uri}</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">{t("oauthConsent.requestedAccess")}</p>
                <div className="space-y-2">
                  {requestedScopes.map((scope) => (
                    <div key={scope} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      <span>{scopeLabel(scope)}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    <span>{t("oauthConsent.scopeMcpTools")}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => decide(false)} disabled={busy}>
                  <XCircle className="w-4 h-4" />
                  {t("oauthConsent.cancelConnection")}
                </Button>
                <Button onClick={() => decide(true)} disabled={busy}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  {t("oauthConsent.approve")}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
