import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface StripeConnectCardProps {
  stripeAccountId?: string | null;
  onboardingComplete?: boolean;
  onRefresh?: () => void;
}

export default function StripeConnectCard({ stripeAccountId, onboardingComplete, onRefresh }: StripeConnectCardProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
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

  const handleSetup = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-stripe-connect-link", {
        body: {},
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else if (data?.status === "complete") {
        toast({ title: t("stripeConnect.payoutsReady"), description: t("stripeConnect.stripeFullySetUp") });
        onRefresh?.();
      }
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message || t("stripeConnect.couldNotStartOnboarding"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (onboardingComplete) {
    return (
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
          <Button variant="outline" size="sm" className="w-full" onClick={handleSetup} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {t("stripeConnect.managePayouts")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-shadow border-yellow-500/50 bg-yellow-500/5">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-600" />
          {t("stripeConnect.setUpPayouts")}
        </CardTitle>
        <CardDescription>
          {t("stripeConnect.setUpPayoutsDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button className="w-full" onClick={handleSetup} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <DollarSign className="w-4 h-4 mr-2" />}
          {stripeAccountId ? t("stripeConnect.completeOnboarding") : t("stripeConnect.connectBankAccount")}
        </Button>
      </CardContent>
    </Card>
  );
}
