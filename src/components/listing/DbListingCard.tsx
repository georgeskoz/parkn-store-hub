import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import parkingCover from "@/assets/parking-cover.jpg";
import storageCover from "@/assets/storage-cover.jpg";

interface DbListing {
  id: string;
  category: string | null;
  type: string | null;
  title: string | null;
  description: string | null;
  city: string | null;
  province: string | null;
  region: string | null;
  availability: string | null;
  amenities?: string[] | null;
  features?: string[] | null;
  photos?: ({ url?: string | null; path?: string | null } | string)[] | null;
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
}

interface Props {
  listing: DbListing;
  distance?: number;
}

const availColor: Record<string, string> = {
  available: "bg-primary/10 text-primary border-primary/20",
  limited: "bg-accent/10 text-accent-foreground border-accent/20",
  waitlist: "bg-destructive/10 text-destructive border-destructive/20",
  full: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function DbListingCard({ listing, distance }: Props) {
  const category = (listing.category || "").toLowerCase();
  const type = (listing.type || "").toLowerCase();
  const isParking = category === "parking" || type === "parking";
  const l: any = listing;
  const hourly = listing.price_hourly ?? l.hourly ?? null;
  const daily = listing.price_daily ?? l.daily ?? null;
  const weekly = listing.price_weekly ?? l.weekly ?? null;
  const monthly = listing.price_monthly ?? l.monthly ?? null;
  let price: number | null = null;
  let priceLabel = "";
  if (isParking) {
    if (hourly != null) { price = hourly; priceLabel = "/hr"; }
    else if (daily != null) { price = daily; priceLabel = "/day"; }
    else if (weekly != null) { price = weekly; priceLabel = "/wk"; }
    else if (monthly != null) { price = monthly; priceLabel = "/mo"; }
  } else {
    if (monthly != null) { price = monthly; priceLabel = "/mo"; }
    else if (weekly != null) { price = weekly; priceLabel = "/wk"; }
    else if (daily != null) { price = daily; priceLabel = "/day"; }
    else if (hourly != null) { price = hourly; priceLabel = "/hr"; }
  }
  const photos = Array.isArray(listing.photos) ? listing.photos : [];
  const firstPhoto = photos?.[0];
  const coverPhoto = (typeof firstPhoto === "string" ? firstPhoto : firstPhoto?.url) || (isParking ? parkingCover : storageCover);
  const amenities = Array.isArray(listing.amenities)
    ? listing.amenities
    : Array.isArray(listing.features)
      ? listing.features
      : [];

  return (
    <Card className="card-shadow hover:card-shadow-hover transition-all duration-200 overflow-hidden">
      <div className="h-40 bg-muted relative overflow-hidden">
        <img src={coverPhoto} alt={listing.title || "Listing photo"} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute top-3 left-3 flex gap-1.5">
          <Badge variant="secondary" className="text-xs capitalize bg-card/90 backdrop-blur-sm border-0">
            {listing.type || "listing"}
          </Badge>
          <Badge variant="secondary" className="text-xs capitalize bg-card/90 backdrop-blur-sm border-0">
            {listing.category || (isParking ? "parking" : "storage")}
          </Badge>
        </div>
        <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
          <Badge className={`text-xs border ${availColor[listing.availability] || availColor.available}`}>
            {listing.availability === "available"
              ? isParking && listing.spots ? `${listing.spots} spots` : "Available"
              : (listing.availability?.charAt(0)?.toUpperCase() ?? "") + (listing.availability?.slice(1) ?? "")}
          </Badge>
          {distance !== undefined && (
            <Badge className="bg-card/90 backdrop-blur-sm text-foreground border border-border text-[10px]">
              {distance.toFixed(1)} km
            </Badge>
          )}
        </div>
      </div>

      <CardContent className="p-4 space-y-2.5">
        <h3 className="font-semibold text-foreground leading-tight line-clamp-1">{listing.title || "Untitled listing"}</h3>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <MapPin className="w-3 h-3" /> {listing.region ? `${listing.region}, ` : ""}{[listing.city, listing.province].filter(Boolean).join(", ") || "Quebec"}
        </p>
        <p className="text-xs text-muted-foreground line-clamp-2">{listing.description || "No description provided."}</p>

        {listing.size && (
          <p className="text-xs text-muted-foreground">{listing.size} ft · {listing.sqft} sqft</p>
        )}

        <div className="flex flex-wrap gap-1">
          {amenities.slice(0, 3).map((f) => (
            <Badge key={f} variant="outline" className="text-[10px] py-0 px-1.5 font-normal text-muted-foreground">{f}</Badge>
          ))}
          {amenities.length > 3 && (
            <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal text-muted-foreground">+{amenities.length - 3}</Badge>
          )}
        </div>

        {listing.student_discount && (
          <Badge variant="secondary" className="text-[10px]">🎓 {listing.student_discount_percent}% Student Discount</Badge>
        )}

        <div className="flex items-end justify-between pt-2 border-t border-border">
          <div>
            {price ? (
              <>
                <span className="text-xl font-bold text-foreground">${price}</span>
                <span className="text-xs text-muted-foreground ml-1">{priceLabel}</span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">Contact for pricing</span>
            )}
          </div>
          <Button size="sm" className="text-xs h-8" asChild>
            <Link to={`/listing/${listing.id}`}>View</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
