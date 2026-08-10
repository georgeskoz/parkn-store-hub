import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowLeft } from "lucide-react";

export default function BookingSuccess() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16 container mx-auto px-4 max-w-lg text-center">
        <CheckCircle className="w-20 h-20 text-primary mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-foreground mb-2">{t("bookingSuccess.paymentSuccessful")}</h1>
        <p className="text-muted-foreground mb-8">
          {t("bookingSuccess.confirmationMessage")}
        </p>

        <Card className="card-shadow mb-6">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              {t("bookingSuccess.sessionReference")} <code className="text-xs bg-muted px-2 py-1 rounded">{sessionId?.slice(0, 20)}...</code>
            </p>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" asChild>
            <Link to="/dashboard"><ArrowLeft className="w-4 h-4 mr-1" /> {t("nav.dashboard")}</Link>
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
