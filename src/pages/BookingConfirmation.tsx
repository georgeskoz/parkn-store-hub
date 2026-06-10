import { useLocation, Link, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { CheckCircle, MapPin, Calendar, ArrowLeft, CreditCard, Loader2, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface BookingState {
  listingType: string;
  listingId: string;
  title: string;
  address: string;
  startDate: string;
  endDate: string;
  rate: string;
  unitPrice: number;
  units: number;
  subtotal: number;
  gst: number;
  qst: number;
  total: number;
}

interface SurgePreview {
  multiplier: number;
  label: string | null;
  subtotal: number;
  gst: number;
  qst: number;
  total: number;
}

export default function BookingConfirmation() {
  const { state } = useLocation() as { state: BookingState | null };
  const { user } = useAuth();
  const [paying, setPaying] = useState(false);
  const [surge, setSurge] = useState<SurgePreview | null>(null);

  useEffect(() => {
    if (!state) return;
    (async () => {
      const { data: listing } = await supabase
        .from("listings")
        .select("city, category")
        .eq("id", state.listingId)
        .single();
      if (!listing) return;
      const nowIso = new Date().toISOString();
      const { data: rules } = await supabase
        .from("surge_pricing")
        .select("label, surge_multiplier, start_at, end_at, category")
        .eq("city", listing.city)
        .eq("is_active", true)
        .or(`category.eq.${listing.category},category.eq.all`)
        .lte("start_at", nowIso)
        .gte("end_at", nowIso);
      let best = { multiplier: 1, label: null as string | null };
      for (const r of rules || []) {
        if (Number(r.surge_multiplier) > best.multiplier) {
          best = { multiplier: Number(r.surge_multiplier), label: r.label };
        }
      }
      if (best.multiplier > 1) {
        const subtotal = +(state.subtotal * best.multiplier).toFixed(2);
        const gst = +(subtotal * 0.05).toFixed(2);
        const qst = +(subtotal * 0.09975).toFixed(2);
        const total = +(subtotal + gst + qst).toFixed(2);
        setSurge({ multiplier: best.multiplier, label: best.label, subtotal, gst, qst, total });
      }
    })();
  }, [state]);

  if (!state) return <Navigate to="/" replace />;

  const start = new Date(state.startDate);
  const end = new Date(state.endDate);
  const displayTotal = surge ? surge.total : state.total;
  const displaySubtotal = surge ? surge.subtotal : state.subtotal;
  const displayGst = surge ? surge.gst : state.gst;
  const displayQst = surge ? surge.qst : state.qst;

  const handlePay = async () => {
    if (!user) {
      toast({ title: "Please sign in", description: "You must be logged in to complete a booking.", variant: "destructive" });
      return;
    }
    setPaying(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-booking-payment", { body: state });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
      else throw new Error("No checkout URL returned");
    } catch (err: any) {
      console.error(err);
      toast({ title: "Payment error", description: err.message || "Could not start payment.", variant: "destructive" });
    } finally {
      setPaying(false);
    }
  };

  const platformFee = +(displayTotal * 0.1).toFixed(2);
  const providerPayout = +(displayTotal - platformFee).toFixed(2);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16 container mx-auto px-4 max-w-xl">
        <div className="text-center mb-8">
          <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground">Confirm Your Booking</h1>
          <p className="text-muted-foreground mt-1">Review details and proceed to payment.</p>
        </div>

        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-lg">{state.title}</CardTitle>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {state.address}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Check-in</p>
                <p className="text-sm font-medium text-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {format(start, "MMM d, yyyy")}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Check-out</p>
                <p className="text-sm font-medium text-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {format(end, "MMM d, yyyy")}
                </p>
              </div>
            </div>

            {surge && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-50 dark:bg-amber-950/30 p-3">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold text-sm">
                  <Zap className="w-4 h-4" /> Event Surge Pricing — {surge.multiplier}x
                </div>
                {surge.label && (
                  <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">{surge.label}</p>
                )}
                <div className="flex items-center gap-2 text-xs mt-2">
                  <span className="line-through text-muted-foreground">${state.total.toFixed(2)}</span>
                  <span className="font-semibold text-amber-700 dark:text-amber-400">${surge.total.toFixed(2)}</span>
                  <Badge variant="outline" className="ml-auto">+${(surge.total - state.total).toFixed(2)}</Badge>
                </div>
              </div>
            )}

            <div className="border-t border-border pt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground capitalize">{state.rate} rate × {state.units}</span>
                <span>${displaySubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground text-xs">
                <span>GST (5%)</span><span>${displayGst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground text-xs">
                <span>QST (9.975%)</span><span>${displayQst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-foreground border-t border-border pt-2">
                <span>Total</span><span>${displayTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between"><span>Platform fee (10%)</span><span>${platformFee.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Provider payout (90%)</span><span>${providerPayout.toFixed(2)}</span></div>
            </div>

            <Button className="w-full" size="lg" onClick={handlePay} disabled={paying}>
              {paying ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
              ) : (
                <><CreditCard className="w-4 h-4 mr-2" /> Pay ${displayTotal.toFixed(2)} CAD</>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="flex gap-3 mt-6">
          <Button variant="outline" className="flex-1" asChild>
            <Link to="/dashboard"><ArrowLeft className="w-4 h-4 mr-1" /> Dashboard</Link>
          </Button>
          <Button variant="outline" className="flex-1" asChild>
            <Link to={`/${state.listingType}`}>Browse More</Link>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
