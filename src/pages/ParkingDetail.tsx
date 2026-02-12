import { useParams, Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { parkingListings } from "@/data/parkingListings";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, differenceInDays, differenceInHours } from "date-fns";
import { cn } from "@/lib/utils";
import {
  MapPin, Star, ArrowLeft, Car, User, Clock, Check, CalendarIcon,
} from "lucide-react";

export default function ParkingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const listing = parkingListings.find((l) => l.id === id);

  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  if (!listing) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16 container mx-auto px-4 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Listing not found</h1>
          <Button asChild><Link to="/parking">Back to Parking</Link></Button>
        </main>
        <Footer />
      </div>
    );
  }

  const durationDays = startDate && endDate ? Math.max(differenceInDays(endDate, startDate), 1) : 0;
  const bestRate = durationDays >= 30 ? "monthly" : durationDays >= 1 ? "daily" : "hourly";
  const unitPrice = listing.pricing[bestRate];
  const units = bestRate === "monthly" ? Math.ceil(durationDays / 30) : bestRate === "daily" ? durationDays : durationDays * 24;
  const subtotal = unitPrice * units;
  const gst = +(subtotal * 0.05).toFixed(2);
  const qst = +(subtotal * 0.09975).toFixed(2);
  const total = +(subtotal + gst + qst).toFixed(2);

  const handleBook = () => {
    if (!startDate || !endDate) return;
    navigate(`/booking/confirm`, {
      state: {
        listingType: "parking",
        listingId: listing.id,
        title: listing.title,
        address: listing.location.address,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        rate: bestRate,
        unitPrice,
        units,
        subtotal,
        gst,
        qst,
        total,
      },
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-16">
        <div className="container mx-auto px-4 mb-6">
          <Link to="/parking" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to parking
          </Link>
        </div>

        <div className="container mx-auto px-4 grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="h-56 rounded-xl bg-muted flex items-center justify-center">
              <Car className="w-16 h-16 text-muted-foreground/30" />
            </div>

            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{listing.title}</h1>
                  <p className="text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="w-4 h-4" /> {listing.location.address}, {listing.location.city}
                  </p>
                </div>
                <Badge variant="secondary" className="capitalize shrink-0">{listing.type}</Badge>
              </div>
              <div className="flex items-center gap-4 mt-3 text-sm">
                <span className="flex items-center gap-1 text-foreground font-medium">
                  <Star className="w-4 h-4 fill-accent text-accent" /> {listing.rating}
                  <span className="text-muted-foreground font-normal">({listing.reviewCount})</span>
                </span>
                <span className="text-muted-foreground">{listing.spots} spots</span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <User className="w-3.5 h-3.5" /> {listing.providerName}
                </span>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground mb-2">About</h2>
              <p className="text-muted-foreground leading-relaxed">{listing.description}</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground mb-3">Features</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {listing.features.map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="w-4 h-4 text-primary shrink-0" /> {f}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground mb-3">Pricing</h2>
              <div className="grid grid-cols-3 gap-3">
                {(["hourly", "daily", "monthly"] as const).map((mode) => (
                  <div key={mode} className="p-4 rounded-lg border border-border text-center">
                    <p className="text-sm text-muted-foreground capitalize">{mode}</p>
                    <p className="text-xl font-bold text-foreground mt-1">${listing.pricing[mode]}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Booking sidebar */}
          <div>
            <Card className="card-shadow sticky top-24">
              <CardHeader>
                <CardTitle className="text-lg">Book This Spot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Start</p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left text-xs h-9", !startDate && "text-muted-foreground")}>
                          <CalendarIcon className="w-3 h-3 mr-1" />
                          {startDate ? format(startDate, "MMM d") : "Pick date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={startDate} onSelect={(d) => { setStartDate(d); if (endDate && d && d > endDate) setEndDate(undefined); }} disabled={(d) => d < new Date()} className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">End</p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left text-xs h-9", !endDate && "text-muted-foreground")}>
                          <CalendarIcon className="w-3 h-3 mr-1" />
                          {endDate ? format(endDate, "MMM d") : "Pick date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={endDate} onSelect={setEndDate} disabled={(d) => d < (startDate || new Date())} className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {durationDays > 0 && (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span><Clock className="w-3 h-3 inline mr-1" />{durationDays} day{durationDays > 1 ? "s" : ""}</span>
                      <span className="capitalize">{bestRate} rate</span>
                    </div>
                    <div className="flex justify-between"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between text-muted-foreground text-xs"><span>GST (5%)</span><span>${gst}</span></div>
                    <div className="flex justify-between text-muted-foreground text-xs"><span>QST (9.975%)</span><span>${qst}</span></div>
                    <div className="flex justify-between font-bold text-foreground border-t border-border pt-2"><span>Total</span><span>${total}</span></div>
                  </div>
                )}

                <Button className="w-full" size="lg" disabled={!startDate || !endDate} onClick={handleBook}>
                  {durationDays > 0 ? `Book — $${total}` : "Select dates to book"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
