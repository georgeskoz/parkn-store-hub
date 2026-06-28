import { useEffect, useState } from "react";
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
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("stripe") === "connected") {
      toast({
        title: "Bank account connected",
        description: "You're ready to receive payouts!",
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
        toast({ title: "Payouts ready", description: "Your Stripe account is fully set up." });
        onRefresh?.();
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Could not start Stripe onboarding.", variant: "destructive" });
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
            Payouts active
          </CardTitle>
          <CardDescription>Your Stripe account is connected and ready to receive earnings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Badge variant="outline" className="text-green-700 border-green-300">Stripe Connected</Badge>
          <Button variant="outline" size="sm" className="w-full" onClick={handleSetup} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Manage Payouts
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
          Set up payouts
        </CardTitle>
        <CardDescription>
          Set up payouts to receive earnings from your bookings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button className="w-full" onClick={handleSetup} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <DollarSign className="w-4 h-4 mr-2" />}
          {stripeAccountId ? "Complete Onboarding" : "Connect Bank Account"}
        </Button>
      </CardContent>
    </Card>
  );
}
