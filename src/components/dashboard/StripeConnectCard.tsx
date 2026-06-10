import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Loader2, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface StripeConnectCardProps {
  stripeAccountId?: string | null;
  onboardingComplete?: boolean;
  onRefresh?: () => void;
}

export default function StripeConnectCard({ stripeAccountId, onboardingComplete, onRefresh }: StripeConnectCardProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

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
      <Card className="card-shadow border-green-200/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Payouts Active
          </CardTitle>
          <CardDescription>You're ready to receive earnings.</CardDescription>
        </CardHeader>
        <CardContent>
          <Badge variant="outline" className="text-green-600 border-green-200">Stripe Connected</Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-shadow">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" />
          Set Up Payouts
        </CardTitle>
        <CardDescription>Connect your Stripe account to receive payments.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button className="w-full" onClick={handleSetup} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          {stripeAccountId ? "Complete Onboarding" : "Connect Stripe Account"}
        </Button>
      </CardContent>
    </Card>
  );
}
