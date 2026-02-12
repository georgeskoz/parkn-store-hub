import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { StorageListing, DurationOption } from "@/data/storageListings";
import { Star, Shield, Check, X } from "lucide-react";

interface Props {
  items: StorageListing[];
  duration: DurationOption;
  open: boolean;
  onClose: () => void;
}

export default function ComparisonModal({ items, duration, open, onClose }: Props) {
  const formattedDuration = duration === "daily" ? "/day" : duration === "weekly" ? "/wk" : duration === "monthly" ? "/mo" : "/4mo";
  const allFeatures = [...new Set(items.flatMap(i => i.features))];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Compare Storage Options</DialogTitle>
        </DialogHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 pr-4 text-muted-foreground font-medium w-32">Detail</th>
                {items.map(item => (
                  <th key={item.id} className="text-left py-3 px-2 font-semibold text-foreground min-w-[160px]">
                    {item.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <Row label="Price">
                {items.map(i => (
                  <td key={i.id} className="px-2 py-2.5">
                    <span className="font-bold text-foreground">${i.pricing[duration]}</span>
                    <span className="text-muted-foreground text-xs ml-1">{formattedDuration}</span>
                  </td>
                ))}
              </Row>
              <Row label="Type">
                {items.map(i => <td key={i.id} className="px-2 py-2.5 capitalize text-foreground">{i.type}</td>)}
              </Row>
              <Row label="Size">
                {items.map(i => <td key={i.id} className="px-2 py-2.5 text-foreground">{i.size} ({i.sqft} sqft)</td>)}
              </Row>
              <Row label="$/sqft">
                {items.map(i => (
                  <td key={i.id} className="px-2 py-2.5 text-foreground">
                    ${(i.pricing[duration] / i.sqft).toFixed(2)}{formattedDuration}
                  </td>
                ))}
              </Row>
              <Row label="Rating">
                {items.map(i => (
                  <td key={i.id} className="px-2 py-2.5">
                    <span className="flex items-center gap-1 text-foreground">
                      <Star className="w-3.5 h-3.5 fill-accent text-accent" /> {i.rating} ({i.reviewCount})
                    </span>
                  </td>
                ))}
              </Row>
              <Row label="Location">
                {items.map(i => <td key={i.id} className="px-2 py-2.5 text-foreground">{i.location.city}</td>)}
              </Row>
              <Row label="Cancellation">
                {items.map(i => (
                  <td key={i.id} className="px-2 py-2.5">
                    <Badge variant="outline" className="text-xs capitalize">{i.cancellationPolicy}</Badge>
                  </td>
                ))}
              </Row>
              {/* Feature matrix */}
              {allFeatures.map(feature => (
                <Row key={feature} label={feature}>
                  {items.map(i => (
                    <td key={i.id} className="px-2 py-2">
                      {i.features.includes(feature)
                        ? <Check className="w-4 h-4 text-primary" />
                        : <X className="w-4 h-4 text-muted-foreground/30" />
                      }
                    </td>
                  ))}
                </Row>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr>
      <td className="py-2.5 pr-4 text-muted-foreground font-medium text-xs whitespace-nowrap">{label}</td>
      {children}
    </tr>
  );
}
