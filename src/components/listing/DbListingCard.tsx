import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Car, Warehouse } from "lucide-react";

interface DbListing {
  id: string;
  category: string;
  type: string;
  title: string;
  description: string;
  city: string;
  province: string;
  region: string | null;
  availability: string;
  features: string[];
  photos: { url: string; path: string }[];
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
  const isParking = listing.category === "parking";
  const price = listing.monthly || listing.daily || listing.hourly;
  const priceLabel = listing.monthly ? "/mo" : listing.daily ? "/day" : listing.hourly ? "/hr" : "";
  const coverPhoto = listing.photos?.[0]?.url;

  return (
    <Card className="card-shadow hover:card-shadow-hover transition-all duration-200 overflow-hidden">
      <div className="h-40 bg-muted flex items-center justify-center relative overflow-hidden">
        {coverPhoto ? (
          <img src={coverPhoto} alt={listing.title} className="w-full h-full object-cover" />
        ) : (
          isParking ? <Car className="w-10 h-10 text-muted-foreground/30" /> : <Warehouse className="w-10 h-10 text-muted-foreground/30" />
        )}
        <div className="absolute top-3 left-3 flex gap-1.5">
          <Badge variant="secondary" className="text-xs capitalize bg-card/90 backdrop-blur-sm border-0">
            {listing.type}
          </Badge>
          <Badge variant="secondary" className="text-xs capitalize bg-card/90 backdrop-blur-sm border-0">
            {listing.category}
          </Badge>
        </div>
        <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
          <Badge className={`text-xs border ${availColor[listing.availability] || availColor.available}`}>
            {listing.availability === "available"
              ? isParking && listing.spots ? `${listing.spots} spots` : "Available"
              : listing.availability.charAt(0).toUpperCase() + listing.availability.slice(1)}
          </Badge>
          {distance !== undefined && (
            <Badge className="bg-card/90 backdrop-blur-sm text-foreground border border-border text-[10px]">
              {distance.toFixed(1)} km
            </Badge>
          )}
        </div>
      </div>

      <CardContent className="p-4 space-y-2.5">
        <h3 className="font-semibold text-foreground leading-tight line-clamp-1">{listing.title}</h3>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <MapPin className="w-3 h-3" /> {listing.region ? `${listing.region}, ` : ""}{listing.city}, {listing.province}
        </p>
        <p className="text-xs text-muted-foreground line-clamp-2">{listing.description}</p>

        {listing.size && (
          <p className="text-xs text-muted-foreground">{listing.size} ft · {listing.sqft} sqft</p>
        )}

        <div className="flex flex-wrap gap-1">
          {listing.features.slice(0, 3).map((f) => (
            <Badge key={f} variant="outline" className="text-[10px] py-0 px-1.5 font-normal text-muted-foreground">{f}</Badge>
          ))}
          {listing.features.length > 3 && (
            <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal text-muted-foreground">+{listing.features.length - 3}</Badge>
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
