import { useEffect, useState } from "react";
import { useSearchParams, Navigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// The Stripe webhook (stripe-webhook / "bright-service") writes
// stripe_session_id onto the booking row when it processes
// checkout.session.completed -- that can lag a second or two behind the
// browser redirect landing here, so this polls briefly instead of
// assuming the row is already updated on first render.
const POLL_ATTEMPTS = 6;
const POLL_INTERVAL_MS = 1000;

export default function BookingSuccess() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [bookingId, setBookingId] = useState<string | null>(null);
  const [stillProcessing, setStillProcessing] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    (async () => {
      for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
        const { data } = await supabase
          .from("bookings")
          .select("id")
          .eq("stripe_session_id", sessionId)
          .maybeSingle();
        if (cancelled) return;
        if (data?.id) {
          setBookingId(data.id);
          return;
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }
      if (!cancelled) setStillProcessing(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (bookingId) {
    return <Navigate to={`/booking/receipt/${bookingId}?justPaid=1`} replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16 container mx-auto px-4 max-w-lg text-center">
        <CheckCircle className="w-20 h-20 text-primary mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-foreground mb-2">{t("bookingSuccess.paymentSuccessful")}</h1>
        <p className="text-muted-foreground mb-8">
          {stillProcessing ? t("bookingSuccess.stillProcessing") : t("bookingSuccess.confirmationMessage")}
        </p>

        <Card className="card-shadow mb-6">
          <CardContent className="pt-6 flex items-center justify-center gap-3">
            {!stillProcessing && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            <p className="text-sm text-muted-foreground">
              {t("bookingSuccess.sessionReference")}{" "}
              <code className="text-xs bg-muted px-2 py-1 rounded">{sessionId?.slice(0, 20)}...</code>
            </p>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="w-4 h-4 mr-1" /> {t("nav.dashboard")}
            </Link>
          </Button>
          <Button className="flex-1" asChild>
            <Link to="/">{t("bookingSuccess.backToHome")}</Link>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
