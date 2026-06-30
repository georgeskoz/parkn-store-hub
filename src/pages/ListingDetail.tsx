import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import { MapPin, ArrowLeft, User, Mail, Phone, Check, CalendarIcon, Clock } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import ConversationPanel from "@/components/messaging/ConversationPanel";
import ListingReviews, { useListingRatingSummary } from "@/components/reviews/ListingReviews";
import StarRating from "@/components/reviews/StarRating";
import AvailabilitySlots from "@/components/listing/AvailabilitySlots";
import StorageAvailabilityCalendar from "@/components/listing/StorageAvailabilityCalendar";
import { addMonths } from "date-fns";
import SEO from "@/components/SEO";

interface DbListing {
  id: string;
  category: string;
  type: string;
  title: string;
  description: string;
  address: string;
  city: string;
  province: string;
  country: string;
  region: string | null;
  availability: string;
  features: string[];
  photos: { url: string; path: string }[];
  lat: number;
  lng: number;
  // pricing
  price_hourly: number | null;
  price_daily: number | null;
  price_monthly: number | null;
  price_weekly: number | null;
  seasonal: number | null;
  // storage
  size: string | null;
  sqft: number | null;
  spots: number | null;
  student_discount: boolean;
  student_discount_percent: number | null;
  student_universities: string | null;
  nearby_landmarks: string[];
  user_id: string;
}

interface UserProfile {
  display_name: string;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
}

const defaultMarkerIcon = L.icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const availColor: Record<string, string> = {
  available: "bg-primary/10 text-primary border-primary/20",
  limited: "bg-accent/10 text-accent-foreground border-accent/20",
  waitlist: "bg-destructive/10 text-destructive border-destructive/20",
  full: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [listing, setListing] = useState<DbListing | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMessages, setShowMessages] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [startTime, setStartTime] = useState<string>("09:00");
  const [endTime, setEndTime] = useState<string>("17:00");
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [tempStart, setTempStart] = useState<Date | undefined>();
  const [tempEnd, setTempEnd] = useState<Date | undefined>();
  const [blockedDays, setBlockedDays] = useState<Set<string>>(new Set());
  const [openDow, setOpenDow] = useState<Set<number> | null>(null);

  useEffect(() => {
    const fetchListing = async () => {
      if (!id) return;

      try {
        const { data, error: fetchError } = await supabase
          .from("listings")
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (fetchError) throw fetchError;
        if (!data) {
          setError("Listing not found");
          return;
        }

        // Cast photos safely
        const photoArray = (Array.isArray(data.photos) ? data.photos : []) as { url: string; path: string }[];
        setListing({ ...data, photos: photoArray } as unknown as DbListing);

        // Fetch profile info
        const { data: profileData } = await (supabase as any)
          .from("profiles_public")
          .select("display_name, phone, avatar_url, bio")
          .eq("id", data.user_id)
          .maybeSingle();

        if (profileData) {
          setProfile(profileData as UserProfile);
        }

        // Fetch host availability config
        const [blocksRes, slotsRes] = await Promise.all([
          (supabase as any).from("listing_blocked_dates").select("blocked_date").eq("listing_id", id),
          supabase.from("listing_availability_slots").select("day_of_week").eq("listing_id", id),
        ]);
        const b = new Set<string>();
        for (const r of (blocksRes.data || []) as any[]) b.add(String(r.blocked_date).slice(0, 10));
        setBlockedDays(b);
        const slots = (slotsRes.data || []) as any[];
        setOpenDow(slots.length > 0 ? new Set(slots.map((s) => s.day_of_week as number)) : null);
      } catch (err) {
        console.error("Error fetching listing:", err);
        setError("Failed to load listing");
      } finally {
        setLoading(false);
      }
    };

    fetchListing();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16 container mx-auto px-4">
          <div className="text-center">
            <div className="h-64 bg-muted rounded-lg animate-pulse mb-6" />
            <div className="space-y-4">
              <div className="h-8 bg-muted rounded w-1/3 mx-auto animate-pulse" />
              <div className="h-4 bg-muted rounded w-2/3 mx-auto animate-pulse" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16 container mx-auto px-4 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {error || "Listing not found"}
          </h1>
          <p className="text-muted-foreground mb-6">
            This listing doesn't exist or has been removed.
          </p>
          <Button asChild>
            <Link to="/find">Back to Marketplace</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const isParking = listing.category === "parking";
  const price = listing.price_monthly || listing.price_daily || listing.price_hourly;
  const priceLabel = listing.price_monthly ? "/month" : listing.price_daily ? "/day" : listing.price_hourly ? "/hour" : "";

  const durationDays = startDate && endDate ? Math.max(differenceInDays(endDate, startDate), 1) : 0;
  const hasMonthly = !!listing.price_monthly;
  const hasDaily = !!listing.price_daily;
  const hasHourly = !!listing.price_hourly;
  const bestRate: "monthly" | "daily" | "hourly" | null =
    durationDays >= 30 && hasMonthly ? "monthly"
    : durationDays >= 1 && hasDaily ? "daily"
    : hasHourly ? "hourly"
    : hasDaily ? "daily"
    : hasMonthly ? "monthly"
    : null;
  const unitPrice = bestRate ? Number(listing[bestRate]) : 0;
  const units = !bestRate ? 0
    : bestRate === "monthly" ? Math.max(Math.ceil(durationDays / 30), 1)
    : bestRate === "daily" ? Math.max(durationDays, 1)
    : Math.max(durationDays * 24, 1);
  const subtotal = +(unitPrice * units).toFixed(2);
  const gst = +(subtotal * 0.05).toFixed(2);
  const qst = +(subtotal * 0.09975).toFixed(2);
  const total = +(subtotal + gst + qst).toFixed(2);

  const applyTime = (d: Date, t: string) => {
    const [h, m] = (t || "").split(":").map(Number);
    const x = new Date(d);
    x.setHours(h || 0, m || 0, 0, 0);
    return x;
  };

  const handleBook = () => {
    if (!startDate || !endDate || !bestRate || !listing) return;
    const needsIntake = listing.category === "parking" || listing.category === "storage";
    navigate(needsIntake ? `/booking/intake` : `/booking/confirm`, {
      state: {
        listingType: listing.category,
        listingId: listing.id,
        title: listing.title,
        address: `${listing.address}, ${listing.city}`,
        startDate: applyTime(startDate, startTime).toISOString(),
        endDate: applyTime(endDate, endTime).toISOString(),
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


  const seoTitle = `${listing.title} — ${[listing.city, listing.region].filter(Boolean).join(", ")} | SpotsVault`;
  const amenitiesList = (listing.features || []).slice(0, 3).join(", ");
  const autoDesc = `Book this ${listing.type || ""} ${listing.category || ""} space in ${listing.city}${listing.region ? ", " + listing.region : ""}${price ? ` starting at $${price}${priceLabel}` : ""}.${amenitiesList ? " Features include " + amenitiesList + "." : ""}`.trim();
  const seoDesc = (listing.description && listing.description.length > 0)
    ? listing.description.slice(0, 155)
    : autoDesc.slice(0, 155);
  const firstPhoto: any = listing.photos?.[0];
  const seoImage = (typeof firstPhoto === "string" ? firstPhoto : firstPhoto?.url) || undefined;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={seoTitle}
        description={seoDesc}
        path={`/listing/${listing.id}`}
        image={seoImage}
        type="product"
      />
      <Navbar />
      <main className="pt-20 pb-16">
        <div className="container mx-auto px-4 mb-6">
          <Link
            to="/find"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to marketplace
          </Link>
        </div>

        <div className="container mx-auto px-4 grid lg:grid-cols-3 gap-8">
          {/* Left — Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Photo carousel */}
            {listing.photos && listing.photos.length > 0 ? (
              <Carousel className="w-full">
                <CarouselContent>
                  {listing.photos.map((photo, idx) => (
                    <CarouselItem key={idx}>
                      <div className="aspect-video rounded-xl overflow-hidden bg-muted flex items-center justify-center">
                        <img
                          src={photo.url}
                          alt={`${listing.title} - photo ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {listing.photos.length > 1 && (
                  <>
                    <CarouselPrevious className="left-2" />
                    <CarouselNext className="right-2" />
                  </>
                )}
              </Carousel>
            ) : (
              <div className="aspect-video rounded-xl bg-muted flex items-center justify-center">
                <p className="text-muted-foreground">No photos available</p>
              </div>
            )}

            <ListingTitleBlock listing={listing} isParking={isParking} />
            {/* end title */}

            {/* Description */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-2">About this space</h2>
              <p className="text-muted-foreground leading-relaxed">{listing.description}</p>
            </div>

            {/* Features */}
            {listing.features && listing.features.length > 0 && (
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
            )}

            {/* Nearby landmarks */}
            {listing.nearby_landmarks && listing.nearby_landmarks.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-3">Nearby Landmarks</h2>
                <div className="flex flex-wrap gap-2">
                  {listing.nearby_landmarks.map((landmark) => (
                    <Badge key={landmark} variant="outline">
                      {landmark}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Pricing */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-3">Pricing</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {listing.price_hourly && (
                  <div className="p-4 rounded-lg border border-border text-center">
                    <p className="text-sm text-muted-foreground">Hourly</p>
                    <p className="text-xl font-bold text-foreground mt-1">${listing.price_hourly}</p>
                  </div>
                )}
                {listing.price_daily && (
                  <div className="p-4 rounded-lg border border-border text-center">
                    <p className="text-sm text-muted-foreground">Daily</p>
                    <p className="text-xl font-bold text-foreground mt-1">${listing.price_daily}</p>
                  </div>
                )}
                {listing.price_weekly && (
                  <div className="p-4 rounded-lg border border-border text-center">
                    <p className="text-sm text-muted-foreground">Weekly</p>
                    <p className="text-xl font-bold text-foreground mt-1">${listing.price_weekly}</p>
                  </div>
                )}
                {listing.price_monthly && (
                  <div className="p-4 rounded-lg border border-border text-center">
                    <p className="text-sm text-muted-foreground">Monthly</p>
                    <p className="text-xl font-bold text-foreground mt-1">${listing.price_monthly}</p>
                  </div>
                )}
                {listing.seasonal && (
                  <div className="p-4 rounded-lg border border-border text-center">
                    <p className="text-sm text-muted-foreground">Seasonal</p>
                    <p className="text-xl font-bold text-foreground mt-1">${listing.seasonal}</p>
                  </div>
                )}
              </div>
              {listing.student_discount && (
                <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <p className="text-sm text-foreground">
                    🎓 <span className="font-semibold">{listing.student_discount_percent}% Student Discount</span>
                    {listing.student_universities && (
                      <span className="text-muted-foreground ml-1">
                        • Available for: {listing.student_universities}
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Reviews */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-3">Reviews</h2>
              <ListingReviews listingId={listing.id} />
            </div>

            {/* Map */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-3">Location</h2>
              <div className="h-80 rounded-lg overflow-hidden border border-border">
                <MapContainer center={[listing.lat, listing.lng]} zoom={15} style={{ height: "100%" }}>
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  <Marker position={[listing.lat, listing.lng]} icon={defaultMarkerIcon}>
                    <Popup>{listing.title}</Popup>
                  </Marker>
                </MapContainer>
              </div>
            </div>
          </div>

          {/* Right — Contact sidebar */}
          <div>
            <Card className="card-shadow sticky top-24">
              <CardHeader>
                <CardTitle className="text-lg">Contact Provider</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Provider info */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shrink-0">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.display_name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{profile?.display_name || "Unknown Provider"}</p>
                    {profile?.bio && <p className="text-xs text-muted-foreground">{profile.bio}</p>}
                  </div>
                </div>

                {/* Contact buttons */}
                <div className="space-y-2 pt-4 border-t border-border">
                  {profile?.phone && (
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <a href={`tel:${profile.phone}`}>
                        <Phone className="w-4 h-4 mr-2" />
                        {profile.phone}
                      </a>
                    </Button>
                  )}
                  <Button className="w-full" onClick={() => setShowMessages(true)}>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Message
                  </Button>
                </div>

                {/* Booking widget */}
                {price && (
                  <div className="pt-4 border-t border-border space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Starting at</p>
                      <p className="text-2xl font-bold text-foreground">
                        ${price}
                        <span className="text-sm text-muted-foreground ml-1">{priceLabel}</span>
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Start</p>
                        <Popover open={startOpen} onOpenChange={(o) => { setStartOpen(o); if (o) setTempStart(startDate); }}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-full justify-start text-left text-xs h-9", !startDate && "text-muted-foreground")}>
                              <CalendarIcon className="w-3 h-3 mr-1" />
                              {startDate ? format(startDate, "MMM d") : "Pick date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={tempStart} onSelect={setTempStart} disabled={(d) => {
                              if (d < new Date(new Date().setHours(0,0,0,0))) return true;
                              const key = format(d, "yyyy-MM-dd");
                              if (blockedDays.has(key)) return true;
                              if (openDow && !openDow.has(d.getDay())) return true;
                              return false;
                            }} className="p-3 pointer-events-auto" />
                            <div className="flex justify-end gap-2 p-3 border-t border-border">
                              <Button variant="ghost" size="sm" onClick={() => setStartOpen(false)}>Cancel</Button>
                              <Button size="sm" disabled={!tempStart} onClick={() => { setStartDate(tempStart); if (endDate && tempStart && tempStart > endDate) setEndDate(undefined); setStartOpen(false); }}>Confirm</Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                        <div className="mt-2">
                          <p className="text-xs text-muted-foreground mb-1">Start time</p>
                          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-2 text-xs" />
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">End</p>
                        <Popover open={endOpen} onOpenChange={(o) => { setEndOpen(o); if (o) setTempEnd(endDate); }}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-full justify-start text-left text-xs h-9", !endDate && "text-muted-foreground")}>
                              <CalendarIcon className="w-3 h-3 mr-1" />
                              {endDate ? format(endDate, "MMM d") : "Pick date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={tempEnd} onSelect={setTempEnd} disabled={(d) => {
                              if (d < (startDate || new Date())) return true;
                              const key = format(d, "yyyy-MM-dd");
                              if (blockedDays.has(key)) return true;
                              if (openDow && !openDow.has(d.getDay())) return true;
                              return false;
                            }} className="p-3 pointer-events-auto" />
                            <div className="flex justify-end gap-2 p-3 border-t border-border">
                              <Button variant="ghost" size="sm" onClick={() => setEndOpen(false)}>Cancel</Button>
                              <Button size="sm" disabled={!tempEnd} onClick={() => { setEndDate(tempEnd); setEndOpen(false); }}>Confirm</Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                        <div className="mt-2">
                          <p className="text-xs text-muted-foreground mb-1">End time</p>
                          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-2 text-xs" />
                        </div>
                      </div>
                    </div>

                    {isParking ? (
                      <>
                        {startDate && (
                          <AvailabilitySlots
                            listingId={listing.id}
                            date={startDate}
                            selectedStart={startTime}
                            selectedEnd={
                              endDate && startDate.toDateString() === endDate.toDateString()
                                ? endTime
                                : undefined
                            }
                            onPickSlot={(w) => {
                              setStartTime(w.start);
                              setEndTime(w.end === "24:00" ? "23:59" : w.end);
                            }}
                          />
                        )}
                        {endDate && startDate && endDate.toDateString() !== startDate.toDateString() && (
                          <AvailabilitySlots
                            listingId={listing.id}
                            date={endDate}
                            selectedEnd={endTime}
                            onPickSlot={(w) => {
                              setEndTime(w.end === "24:00" ? "23:59" : w.end);
                            }}
                          />
                        )}
                      </>
                    ) : (
                      <StorageAvailabilityCalendar
                        listingId={listing.id}
                        selectedStart={startDate}
                        selectedEnd={endDate}
                        onPickStart={(d) => {
                          setStartDate(d);
                          // Default check-out: +1 month (storage minimum rental)
                          if (!endDate || endDate <= d) {
                            setEndDate(addMonths(d, 1));
                          }
                          setStartTime("09:00");
                          setEndTime("09:00");
                        }}
                      />
                    )}


                    {durationDays > 0 && bestRate && (
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between text-muted-foreground text-xs">
                          <span><Clock className="w-3 h-3 inline mr-1" />{durationDays} day{durationDays > 1 ? "s" : ""}</span>
                          <span className="capitalize">{bestRate} rate</span>
                        </div>
                        <div className="flex justify-between"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                        <div className="flex justify-between text-muted-foreground text-xs"><span>GST (5%)</span><span>${gst.toFixed(2)}</span></div>
                        <div className="flex justify-between text-muted-foreground text-xs"><span>QST (9.975%)</span><span>${qst.toFixed(2)}</span></div>
                        <div className="flex justify-between font-bold text-foreground border-t border-border pt-2"><span>Total</span><span>${total.toFixed(2)}</span></div>
                      </div>
                    )}

                    <Button className="w-full" size="lg" disabled={!startDate || !endDate || !bestRate} onClick={handleBook}>
                      {durationDays > 0 && bestRate ? `Book — $${total.toFixed(2)}` : "Select dates to book"}
                    </Button>

                  </div>
                )}
              </CardContent>
            </Card>

            {/* Messaging panel */}
            {showMessages && (
              <div className="fixed bottom-4 right-4 z-50">
                <ConversationPanel
                  listingId={listing.id}
                  providerId={listing.user_id}
                  onClose={() => setShowMessages(false)}
                />
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function ListingTitleBlock({ listing, isParking }: { listing: DbListing; isParking: boolean }) {
  const { avg, count } = useListingRatingSummary(listing.id);
  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">{listing.title}</h1>
          <div className="flex items-center gap-2 mt-2">
            <StarRating value={avg} readOnly size={16} />
            <span className="text-sm text-muted-foreground">
              {count > 0 ? `${avg.toFixed(1)} (${count} review${count > 1 ? "s" : ""})` : "No reviews yet"}
            </span>
          </div>
          <p className="text-muted-foreground flex items-center gap-1 mt-2">
            <MapPin className="w-4 h-4" />
            {listing.address}
            {listing.region && `, ${listing.region}`}, {listing.city}, {listing.province}
          </p>
        </div>
        <Badge variant="secondary" className="capitalize shrink-0">
          {listing.type}
        </Badge>
      </div>
      <div className="flex items-center gap-4 mt-4 text-sm flex-wrap">
        <Badge className={`text-xs border ${availColor[listing.availability] || availColor.available}`}>
          {listing.availability === "available"
            ? isParking && listing.spots
              ? `${listing.spots} spots`
              : "Available"
            : (listing.availability?.charAt(0)?.toUpperCase() ?? "") + (listing.availability?.slice(1) ?? "")}
        </Badge>
        {listing.category === "storage" && listing.size && (
          <span className="text-muted-foreground">{listing.size} ft · {listing.sqft} sqft</span>
        )}
        {listing.category === "parking" && listing.spots && (
          <span className="text-muted-foreground">{listing.spots} spots</span>
        )}
      </div>
    </div>
  );
}
