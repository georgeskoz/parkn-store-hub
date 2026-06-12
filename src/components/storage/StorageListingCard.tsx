import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { StorageListing, DurationOption } from "@/data/storageListings";
import { MapPin, Star, Shield, Thermometer, CloudSun, Warehouse, Trees } from "lucide-react";
import storageCover from "@/assets/storage-cover.jpg";

const typeIcons: Record<string, React.ReactNode> = {
  heated: <Thermometer className="w-4 h-4" />,
  "climate-controlled": <CloudSun className="w-4 h-4" />,
  indoor: <Warehouse className="w-4 h-4" />,
  outdoor: <Trees className="w-4 h-4" />,
};

const typeLabels: Record<string, string> = {
  heated: "Heated",
  "climate-controlled": "Climate Ctrl",
  indoor: "Indoor",
  outdoor: "Outdoor",
};

const availabilityColors: Record<string, string> = {
  available: "bg-primary/10 text-primary border-primary/20",
  limited: "bg-accent/10 text-accent-foreground border-accent/20",
  waitlist: "bg-destructive/10 text-destructive border-destructive/20",
};

interface Props {
  listing: StorageListing;
  duration: DurationOption;
  isComparing: boolean;
  onToggleCompare: (id: string) => void;
}

export default function StorageListingCard({ listing, duration, isComparing, onToggleCompare }: Props) {
  const price = listing.pricing[duration];
  const durationLabel = duration === "seasonal" ? "/ 4 mo" : `/ ${duration.replace("ly", "").replace("month", "mo")}`;
  const formattedDuration = duration === "daily" ? "/ day" : duration === "weekly" ? "/ wk" : duration === "monthly" ? "/ mo" : "/ 4 mo";

  return (
    <Card className="group overflow-hidden transition-all duration-200 hover:card-shadow-hover card-shadow border-border">
      {/* Image placeholder */}
      <div className="relative h-44 bg-muted overflow-hidden">
        <img src={listing.imageUrl && listing.imageUrl !== "/placeholder.svg" ? listing.imageUrl : storageCover} alt={listing.title} loading="lazy" width={800} height={512} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/20 to-transparent z-10" />
        <div className="absolute top-3 left-3 z-20 flex gap-1.5">
          <Badge variant="secondary" className="flex items-center gap-1 text-xs font-medium bg-card/90 backdrop-blur-sm border-0">
            {typeIcons[listing.type]}
            {typeLabels[listing.type]}
          </Badge>
        </div>
        <div className="absolute top-3 right-3 z-20">
          <Badge className={`text-xs border ${availabilityColors[listing.availability]}`}>
            {listing.availability === "available" ? "Available" : listing.availability === "limited" ? "Limited" : "Waitlist"}
          </Badge>
        </div>
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Title & location */}
        <div>
          <h3 className="font-semibold text-foreground leading-tight line-clamp-1">{listing.title}</h3>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <MapPin className="w-3 h-3" />
            {listing.location.city}, {listing.location.province}
          </p>
        </div>

        {/* Size & rating */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{listing.size} ft · {listing.sqft} sqft</span>
          <span className="flex items-center gap-1 text-foreground font-medium">
            <Star className="w-3.5 h-3.5 fill-accent text-accent" />
            {listing.rating} <span className="text-muted-foreground font-normal">({listing.reviewCount})</span>
          </span>
        </div>

        {/* Features */}
        <div className="flex flex-wrap gap-1">
          {listing.features.slice(0, 3).map(f => (
            <Badge key={f} variant="outline" className="text-[10px] py-0 px-1.5 font-normal text-muted-foreground">
              {f}
            </Badge>
          ))}
          {listing.features.length > 3 && (
            <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal text-muted-foreground">
              +{listing.features.length - 3}
            </Badge>
          )}
        </div>

        {/* Price & actions */}
        <div className="flex items-end justify-between pt-1 border-t border-border">
          <div>
            <span className="text-xl font-bold text-foreground">${price}</span>
            <span className="text-xs text-muted-foreground ml-1">{formattedDuration}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Checkbox
                id={`compare-${listing.id}`}
                checked={isComparing}
                onCheckedChange={() => onToggleCompare(listing.id)}
                className="h-4 w-4"
              />
              <label htmlFor={`compare-${listing.id}`} className="text-xs text-muted-foreground cursor-pointer">
                Compare
              </label>
            </div>
            <Button size="sm" className="text-xs h-8" asChild><Link to={`/storage/${listing.id}`}>View</Link></Button>
          </div>
        </div>

        {/* Cancellation */}
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Shield className="w-3 h-3" />
          {listing.cancellationPolicy.charAt(0).toUpperCase() + listing.cancellationPolicy.slice(1)} cancellation
        </p>
      </CardContent>
    </Card>
  );
}
