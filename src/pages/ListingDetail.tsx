import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import { MapPin, ArrowLeft, User, Mail, Phone, Check } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import ConversationPanel from "@/components/messaging/ConversationPanel";

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
  hourly: number | null;
  daily: number | null;
  monthly: number | null;
  weekly: number | null;
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
        const { data: profileData } = await supabase
          .from("profiles")
          .select("display_name, phone, avatar_url, bio")
          .eq("id", data.user_id)
          .maybeSingle();

        if (profileData) {
          setProfile(profileData as UserProfile);
        }
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
  const price = listing.monthly || listing.daily || listing.hourly;
  const priceLabel = listing.monthly ? "/month" : listing.daily ? "/day" : listing.hourly ? "/hour" : "";

  return (
    <div className="min-h-screen bg-background">
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

            {/* Title & meta */}
            <div>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-foreground">{listing.title}</h1>
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
                    : listing.availability.charAt(0).toUpperCase() + listing.availability.slice(1)}
                </Badge>
                {listing.category === "storage" && listing.size && (
                  <span className="text-muted-foreground">{listing.size} ft · {listing.sqft} sqft</span>
                )}
                {listing.category === "parking" && listing.spots && (
                  <span className="text-muted-foreground">{listing.spots} spots</span>
                )}
              </div>
            </div>

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
                {listing.hourly && (
                  <div className="p-4 rounded-lg border border-border text-center">
                    <p className="text-sm text-muted-foreground">Hourly</p>
                    <p className="text-xl font-bold text-foreground mt-1">${listing.hourly}</p>
                  </div>
                )}
                {listing.daily && (
                  <div className="p-4 rounded-lg border border-border text-center">
                    <p className="text-sm text-muted-foreground">Daily</p>
                    <p className="text-xl font-bold text-foreground mt-1">${listing.daily}</p>
                  </div>
                )}
                {listing.weekly && (
                  <div className="p-4 rounded-lg border border-border text-center">
                    <p className="text-sm text-muted-foreground">Weekly</p>
                    <p className="text-xl font-bold text-foreground mt-1">${listing.weekly}</p>
                  </div>
                )}
                {listing.monthly && (
                  <div className="p-4 rounded-lg border border-border text-center">
                    <p className="text-sm text-muted-foreground">Monthly</p>
                    <p className="text-xl font-bold text-foreground mt-1">${listing.monthly}</p>
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

                {/* Pricing summary */}
                {price && (
                  <div className="pt-4 border-t border-border">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs text-muted-foreground">Starting at</p>
                        <p className="text-2xl font-bold text-foreground">
                          ${price}
                          <span className="text-sm text-muted-foreground ml-1">{priceLabel}</span>
                        </p>
                      </div>
                    </div>
                    <Button className="w-full mt-4" size="lg">
                      Request Booking
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
