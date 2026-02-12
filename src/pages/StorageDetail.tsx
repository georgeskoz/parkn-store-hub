import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { storageListings, durationOptions, DurationOption } from "@/data/storageListings";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MapPin, Star, Shield, ArrowLeft, Warehouse, User, Phone,
  Mail, Calendar, Check, Clock, ImageIcon,
} from "lucide-react";

export default function StorageDetail() {
  const { id } = useParams<{ id: string }>();
  const listing = storageListings.find(l => l.id === id);
  const [duration, setDuration] = useState<DurationOption>("monthly");

  if (!listing) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16 container mx-auto px-4 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Listing not found</h1>
          <p className="text-muted-foreground mb-6">This storage listing doesn't exist or has been removed.</p>
          <Button asChild><Link to="/storage">Back to Listings</Link></Button>
        </main>
        <Footer />
      </div>
    );
  }

  const cancellationText: Record<string, string> = {
    flexible: "Free cancellation up to 24 hours before. Full refund.",
    moderate: "Free cancellation up to 5 days before. 50% refund within 5 days.",
    strict: "50% refund up to 7 days before. No refund after that.",
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-16">
        {/* Breadcrumb */}
        <div className="container mx-auto px-4 mb-6">
          <Link to="/storage" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to listings
          </Link>
        </div>

        <div className="container mx-auto px-4 grid lg:grid-cols-3 gap-8">
          {/* Left — Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Photo gallery placeholder */}
            <div className="grid grid-cols-4 gap-2 h-72 rounded-xl overflow-hidden">
              <div className="col-span-2 row-span-2 bg-muted flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <ImageIcon className="w-10 h-10 mx-auto mb-2" />
                  <p className="text-sm">Main Photo</p>
                </div>
              </div>
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-muted flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-muted-foreground/40" />
                </div>
              ))}
            </div>

            {/* Title & meta */}
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{listing.title}</h1>
                  <p className="text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="w-4 h-4" /> {listing.location.address}, {listing.location.city}, {listing.location.province}
                  </p>
                </div>
                <Badge variant="secondary" className="capitalize shrink-0">{listing.type}</Badge>
              </div>
              <div className="flex items-center gap-4 mt-3 text-sm">
                <span className="flex items-center gap-1 text-foreground font-medium">
                  <Star className="w-4 h-4 fill-accent text-accent" /> {listing.rating}
                  <span className="text-muted-foreground font-normal">({listing.reviewCount} reviews)</span>
                </span>
                <span className="text-muted-foreground">{listing.size} ft · {listing.sqft} sqft</span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <User className="w-3.5 h-3.5" /> Hosted by {listing.providerName}
                </span>
              </div>
            </div>

            {/* Description */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-2">About this space</h2>
              <p className="text-muted-foreground leading-relaxed">{listing.description}</p>
            </div>

            {/* Features */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-3">Features & Amenities</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {listing.features.map(f => (
                  <div key={f} className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
            </div>

            {/* Cancellation */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-2">Cancellation Policy</h2>
              <div className="flex items-start gap-2 p-4 bg-muted rounded-lg">
                <Shield className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-foreground capitalize">{listing.cancellationPolicy}</p>
                  <p className="text-sm text-muted-foreground mt-1">{cancellationText[listing.cancellationPolicy]}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right — Pricing sidebar */}
          <div className="space-y-4">
            <Card className="card-shadow sticky top-24">
              <CardHeader>
                <CardTitle className="text-lg">Pricing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Duration tabs */}
                <Tabs value={duration} onValueChange={v => setDuration(v as DurationOption)}>
                  <TabsList className="w-full grid grid-cols-4">
                    {durationOptions.map(d => (
                      <TabsTrigger key={d} value={d} className="capitalize text-xs">{d}</TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>

                {/* All pricing tiers */}
                <div className="space-y-2">
                  {durationOptions.map(d => {
                    const label = d === "seasonal" ? "4-month" : d;
                    const isActive = d === duration;
                    return (
                      <div
                        key={d}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                          isActive ? "border-primary bg-primary/5" : "border-border"
                        }`}
                      >
                        <div>
                          <p className={`text-sm font-medium capitalize ${isActive ? "text-primary" : "text-foreground"}`}>{label}</p>
                          <p className="text-xs text-muted-foreground">
                            ${(listing.pricing[d] / (d === "daily" ? 1 : d === "weekly" ? 7 : d === "monthly" ? 30 : 120)).toFixed(2)}/day
                          </p>
                        </div>
                        <p className={`text-lg font-bold ${isActive ? "text-primary" : "text-foreground"}`}>
                          ${listing.pricing[d]}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Savings indicator */}
                {duration !== "daily" && (
                  <p className="text-xs text-primary text-center">
                    Save {Math.round((1 - listing.pricing[duration] / (listing.pricing.daily * (duration === "weekly" ? 7 : duration === "monthly" ? 30 : 120))) * 100)}% vs daily rate
                  </p>
                )}

                {/* CTA */}
                <div className="space-y-2 pt-2">
                  <Button className="w-full" size="lg">
                    <Calendar className="w-4 h-4 mr-2" />
                    Book Now — ${listing.pricing[duration]}
                  </Button>
                  <Button variant="outline" className="w-full" size="lg">
                    <Mail className="w-4 h-4 mr-2" />
                    Contact Provider
                  </Button>
                </div>

                {/* Provider info */}
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <User className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{listing.providerName}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Usually responds within 2 hours
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
