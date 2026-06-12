import { ParkingListing } from "@/data/parkingListings";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Star } from "lucide-react";
import { Link } from "react-router-dom";
import parkingCover from "@/assets/parking-cover.jpg";

type PricingMode = "hourly" | "daily" | "monthly";

export default function ParkingCard({ listing, pricingMode }: { listing: ParkingListing; pricingMode: PricingMode }) {
  const price = listing.pricing[pricingMode];
  const label = pricingMode === "hourly" ? "/hr" : pricingMode === "daily" ? "/day" : "/mo";

  const availColor: Record<string, string> = {
    available: "bg-primary/10 text-primary border-primary/20",
    limited: "bg-accent/10 text-accent-foreground border-accent/20",
    full: "bg-destructive/10 text-destructive border-destructive/20",
  };

  return (
    <Card className="card-shadow hover:card-shadow-hover transition-all duration-200 overflow-hidden">
      <div className="h-36 bg-muted relative overflow-hidden">
        <img src={parkingCover} alt={listing.title} loading="lazy" width={800} height={512} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute top-3 left-3">
          <Badge variant="secondary" className="text-xs capitalize bg-card/90 backdrop-blur-sm border-0">{listing.type}</Badge>
        </div>
        <div className="absolute top-3 right-3">
          <Badge className={`text-xs border ${availColor[listing.availability]}`}>
            {listing.availability === "available" ? `${listing.spots} spots` : listing.availability === "limited" ? "Limited" : "Full"}
          </Badge>
        </div>
      </div>
      <CardContent className="p-4 space-y-2.5">
        <h3 className="font-semibold text-foreground leading-tight line-clamp-1">{listing.title}</h3>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <MapPin className="w-3 h-3" /> {listing.location.region}, {listing.location.city}
        </p>
        <p className="text-xs text-muted-foreground line-clamp-2">{listing.description}</p>
        <div className="flex flex-wrap gap-1">
          {listing.features.slice(0, 3).map(f => (
            <Badge key={f} variant="outline" className="text-[10px] py-0 px-1.5 font-normal text-muted-foreground">{f}</Badge>
          ))}
        </div>
        <div className="flex items-end justify-between pt-2 border-t border-border">
          <div>
            <span className="text-xl font-bold text-foreground">${price}</span>
            <span className="text-xs text-muted-foreground ml-1">{label}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-xs text-foreground">
              <Star className="w-3 h-3 fill-accent text-accent" /> {listing.rating}
            </span>
            <Button size="sm" className="text-xs h-8" asChild>
              <Link to={`/parking/${listing.id}`}>View</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
