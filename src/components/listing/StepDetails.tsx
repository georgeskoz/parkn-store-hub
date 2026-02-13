import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ListChecks } from "lucide-react";
import type { ListingFormData } from "./ListingFormTypes";
import { PARKING_FEATURES, STORAGE_FEATURES, AVAILABILITY_OPTIONS } from "./ListingFormTypes";

interface Props {
  form: ListingFormData;
  update: (key: string, value: any) => void;
  toggleFeature: (f: string) => void;
}

export default function StepDetails({ form, update, toggleFeature }: Props) {
  const featureOptions = form.category === "parking" ? PARKING_FEATURES : STORAGE_FEATURES;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-primary mb-2">
        <ListChecks className="w-5 h-5" />
        <span className="font-semibold text-foreground">Details & Features</span>
      </div>

      <div>
        <Label>Type</Label>
        <Select value={form.type} onValueChange={(v) => update("type", v)}>
          <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
          <SelectContent>
            {form.category === "parking"
              ? ["outdoor", "indoor", "covered", "underground"].map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)
              : ["indoor", "outdoor", "heated", "climate-controlled"].map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Description</Label>
        <Textarea
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          rows={5}
          placeholder="Be thorough — describe access instructions, restrictions, dimensions, surface type, height clearance, lighting, nearby transit, what's included, and anything a visitor should know before arriving."
        />
        <p className="text-xs text-muted-foreground mt-1">The more detail you provide, the fewer surprises for seekers.</p>
      </div>

      {form.category === "parking" && (
        <div>
          <Label>Available Spots</Label>
          <Input type="number" min="1" value={form.spots} onChange={(e) => update("spots", e.target.value)} />
        </div>
      )}

      {form.category === "storage" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Dimensions (e.g. 10x20 ft)</Label>
            <Input value={form.size} onChange={(e) => update("size", e.target.value)} placeholder="10x20" />
          </div>
          <div>
            <Label>Total Sqft</Label>
            <Input type="number" value={form.sqft} onChange={(e) => update("sqft", e.target.value)} placeholder="200" />
          </div>
        </div>
      )}

      <div>
        <Label>Features & Amenities</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {featureOptions.map((f) => (
            <Badge key={f} variant={form.features.includes(f) ? "default" : "outline"} className="cursor-pointer" onClick={() => toggleFeature(f)}>
              {f}
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <Label>Availability</Label>
        <Select value={form.availability} onValueChange={(v) => update("availability", v)}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            {AVAILABILITY_OPTIONS.map((a) => <SelectItem key={a} value={a} className="capitalize">{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
