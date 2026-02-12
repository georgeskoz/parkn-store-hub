import { useLocation, Link, Navigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { CheckCircle, MapPin, Calendar, DollarSign, ArrowLeft } from "lucide-react";

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

export default function BookingConfirmation() {
  const { state } = useLocation() as { state: BookingState | null };

  if (!state) return <Navigate to="/" replace />;

  const start = new Date(state.startDate);
  const end = new Date(state.endDate);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16 container mx-auto px-4 max-w-xl">
        <div className="text-center mb-8">
          <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground">Booking Confirmed!</h1>
          <p className="text-muted-foreground mt-1">Your reservation has been placed successfully.</p>
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

            <div className="border-t border-border pt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground capitalize">{state.rate} rate × {state.units}</span>
                <span>${state.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground text-xs">
                <span>GST (5%)</span><span>${state.gst}</span>
              </div>
              <div className="flex justify-between text-muted-foreground text-xs">
                <span>QST (9.975%)</span><span>${state.qst}</span>
              </div>
              <div className="flex justify-between font-bold text-foreground border-t border-border pt-2">
                <span>Total</span><span>${state.total}</span>
              </div>
            </div>

            <Badge variant="secondary" className="w-full justify-center py-2">
              <DollarSign className="w-3 h-3 mr-1" /> Payment will be processed via Stripe (coming soon)
            </Badge>
          </CardContent>
        </Card>

        <div className="flex gap-3 mt-6">
          <Button variant="outline" className="flex-1" asChild>
            <Link to="/dashboard"><ArrowLeft className="w-4 h-4 mr-1" /> Dashboard</Link>
          </Button>
          <Button className="flex-1" asChild>
            <Link to={`/${state.listingType}`}>Browse More</Link>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
