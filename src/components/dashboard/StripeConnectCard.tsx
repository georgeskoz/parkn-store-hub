import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DollarSign, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import StripeEmbeddedOnboarding from "@/components/dashboard/StripeEmbeddedOnboarding";

interface StripeConnectCardProps {
  stripeAccountId?: string | null;
  onboardingComplete?: boolean;
  bankLast4?: string | null;
  onRefresh?: () => void;
}

export default function StripeConnectCard({ stripeAccountId, onboardingComplete, bankLast4, onRefresh }: StripeConnectCardProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  // Replaces the old window.location.href redirect to a Stripe-hosted
  // page -- onboarding now happens inline, in this dialog, via Stripe
  // Connect embedded components (create-connect-account-session). Nothing
  // needs to load before opening it, so this can just flip straight to
  // true on click instead of the previous async handleSetup round-trip.
  const [embeddedOpen, setEmbeddedOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("stripe") === "connected") {
      toast({
        title: t("stripeConnect.bankAccountConnected"),
        description: t("stripeConnect.readyForPayouts"),
      });
      const params = new URLSearchParams(searchParams);
      params.delete("stripe");
      setSearchParams(params, { replace: true });
      onRefresh?.();
    }
  }, [searchParams, setSearchParams, onRefresh]);

  // Fired when the embedded onboarding component reports the host is done
  // (or has backed out). create-stripe-connect-link is reused purely for
  // its side effect here -- it fetches the account fresh from Stripe and
  // syncs stripe_onboarding_complete/stripe_bank_last4 to the DB -- so the
  // dashboard reflects reality immediately instead of waiting on the
  // account.updated webhook to land. Its `url`/`status` response fields
  // are intentionally unused on this path.
  const handleEmbeddedExit = async () => {
    setEmbeddedOpen(false);
    setLoading(true);
    try {
      await supabase.functions.invoke("create-stripe-connect-link", { body: {} });
    } catch (err: any) {
      console.error("Failed to sync payout status after onboarding:", err?.message);
    } finally {
      setLoading(false);
      onRefresh?.();
    }
  };

  if (onboardingComplete) {
    return (
      <>
        <Card className="card-shadow border-green-500/40 bg-green-500/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              {t("stripeConnect.payoutsActive")}
            </CardTitle>
            <CardDescription>{t("stripeConnect.accountConnectedDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Badge variant="outline" className="text-green-700 border-green-300">{t("stripeConnect.stripeConnected")}</Badge>
            {bankLast4 ? (
              <p className="text-sm text-muted-foreground">
                {t("stripeConnect.bankEndingIn", { last4: bankLast4 })}
              </p>
            ) : null}
            <Button variant="outline" size="sm" className="w-full" onClick={() => setEmbeddedOpen(true)} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {t("stripeConnect.managePayouts")}
            </Button>
          </CardContent>
        </Card>
        <Dialog open={embeddedOpen} onOpenChange={setEmbeddedOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("stripeConnect.managePayouts")}</DialogTitle>
            </DialogHeader>
            <StripeEmbeddedOnboarding onExit={handleEmbeddedExit} />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Account exists but Stripe hasn't finished reviewing it yet (its
  // dashboard status shows "Restricted") -- distinct from never having
  // started, since re-showing the plain "Set up payouts" prompt here reads
  // as if nothing was submitted, when really the host is just waiting on
  // Stripe. bankLast4 (once available) reassures them the bank account
  // itself did save, even while the rest of the review is pending.
  const inReview = !!stripeAccountId;

  return (
    <>
      <Card className="card-shadow border-yellow-500/50 bg-yellow-500/5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            {inReview ? t("stripeConnect.underReview") : t("stripeConnect.setUpPayouts")}
          </CardTitle>
          <CardDescription>
            {inReview ? t("stripeConnect.underReviewDescription") : t("stripeConnect.setUpPayoutsDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {inReview && bankLast4 ? (
            <p className="text-sm text-muted-foreground">
              {t("stripeConnect.bankEndingIn", { last4: bankLast4 })}
            </p>
          ) : null}
          <details className="rounded-md border border-yellow-500/30 bg-background/50 px-3 py-2 text-sm">
            <summary className="cursor-pointer font-medium text-foreground">
              {t("stripeConnect.whatToExpect")}
            </summary>
            <div className="mt-2 space-y-2 text-muted-foreground">
              <p>{t("stripeConnect.needToKnowIntro")}</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>{t("stripeConnect.needIdentityDoc")}</li>
                <li>{t("stripeConnect.needBankDetails")}</li>
                <li>{t("stripeConnect.needBusinessType")}</li>
              </ul>
              <p>{t("stripeConnect.afterSubmitNote")}</p>
            </div>
          </details>
          <Button className="w-full" onClick={() => setEmbeddedOpen(true)} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <DollarSign className="w-4 h-4 mr-2" />}
            {stripeAccountId ? t("stripeConnect.completeOnboarding") : t("stripeConnect.connectBankAccount")}
          </Button>
        </CardContent>
      </Card>
      <Dialog open={embeddedOpen} onOpenChange={setEmbeddedOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{stripeAccountId ? t("stripeConnect.completeOnboarding") : t("stripeConnect.connectBankAccount")}</DialogTitle>
          </DialogHeader>
          <StripeEmbeddedOnboarding onExit={handleEmbeddedExit} />
        </DialogContent>
      </Dialog>
    </>
  );
}
