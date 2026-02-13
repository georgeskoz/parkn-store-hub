import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";
import type { ListingFormData } from "./ListingFormTypes";

interface Props {
  form: ListingFormData;
  update: (key: string, value: any) => void;
}

export default function StepReview({ form, update }: Props) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-foreground">Review Your Listing</h3>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div><span className="text-muted-foreground">Category:</span> <span className="capitalize text-foreground">{form.category}</span></div>
        <div><span className="text-muted-foreground">Type:</span> <span className="capitalize text-foreground">{form.type}</span></div>
        <div className="col-span-2"><span className="text-muted-foreground">Title:</span> <span className="text-foreground">{form.title}</span></div>
        <div className="col-span-2">
          <span className="text-muted-foreground">Address:</span>{" "}
          <span className="text-foreground">
            {form.address}
            {form.unit && `, ${form.unit}`}
            {form.postalCode && ` ${form.postalCode}`}
            , {form.city}, {form.province}, {form.country}
          </span>
        </div>
        <div><span className="text-muted-foreground">Availability:</span> <span className="capitalize text-foreground">{form.availability}</span></div>
        {form.region && <div><span className="text-muted-foreground">Region:</span> <span className="text-foreground">{form.region}</span></div>}
        {form.lat && form.lng && (
          <div className="col-span-2"><span className="text-muted-foreground">Coordinates:</span> <span className="text-foreground">{form.lat.toFixed(5)}, {form.lng.toFixed(5)}</span></div>
        )}
        <div className="col-span-2"><span className="text-muted-foreground">Description:</span> <span className="text-foreground line-clamp-3">{form.description}</span></div>
      </div>

      {/* Photos */}
      {form.photos.length > 0 && (
        <div>
          <span className="text-sm text-muted-foreground">Photos ({form.photos.length}):</span>
          <div className="grid grid-cols-4 gap-2 mt-1">
            {form.photos.map((p) => (
              <img key={p.path} src={p.url} alt={p.name} className="w-full aspect-square object-cover rounded-md border border-border" />
            ))}
          </div>
        </div>
      )}

      {/* Features */}
      {form.features.length > 0 && (
        <div>
          <span className="text-sm text-muted-foreground">Features:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {form.features.map((f) => <Badge key={f} variant="secondary" className="text-xs">{f}</Badge>)}
          </div>
        </div>
      )}

      {/* Pricing */}
      <div>
        <span className="text-sm text-muted-foreground">Pricing:</span>
        <div className="flex gap-3 text-sm mt-1">
          {form.category === "parking" ? (
            <>
              {form.hourly && <span>${form.hourly}/hr</span>}
              {form.daily && <span>${form.daily}/day</span>}
              {form.monthly && <span>${form.monthly}/mo</span>}
            </>
          ) : (
            <>
              {form.daily && <span>${form.daily}/day</span>}
              {form.weekly && <span>${form.weekly}/wk</span>}
              {form.monthly && <span>${form.monthly}/mo</span>}
              {form.seasonal && <span>${form.seasonal}/season</span>}
            </>
          )}
        </div>
      </div>

      {/* Student Discount */}
      {form.studentDiscount && (
        <div className="text-sm">
          <span className="text-muted-foreground">Student Discount:</span>{" "}
          <span className="text-foreground">{form.studentDiscountPercent}% off</span>
          {form.studentUniversities && <span className="text-muted-foreground"> — {form.studentUniversities}</span>}
        </div>
      )}

      {/* Landmarks */}
      {form.nearbyLandmarks.length > 0 && (
        <div>
          <span className="text-sm text-muted-foreground">Nearby Landmarks:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {form.nearbyLandmarks.map((l) => <Badge key={l} variant="outline" className="text-xs">{l}</Badge>)}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-6 p-4 rounded-lg border border-border bg-muted/50 space-y-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
          <div className="text-sm text-foreground">
            <p className="font-semibold mb-1">Liability Disclaimer</p>
            <p className="text-muted-foreground">
              By listing your space, you acknowledge that neither the platform nor the space provider is responsible for any damage, theft, or loss of vehicles, belongings, or stored items. 
              Users park or store at their own risk. It is recommended that both providers and seekers carry appropriate insurance coverage.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 pl-7">
          <Checkbox
            id="disclaimer"
            checked={form.disclaimerAccepted}
            onCheckedChange={(v) => update("disclaimerAccepted", !!v)}
          />
          <Label htmlFor="disclaimer" className="text-sm cursor-pointer">
            I understand and accept the terms above
          </Label>
        </div>
      </div>
    </div>
  );
}
