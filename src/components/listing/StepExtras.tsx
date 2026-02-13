import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { GraduationCap, Landmark, X } from "lucide-react";
import type { ListingFormData } from "./ListingFormTypes";
import { COMMON_LANDMARKS } from "./ListingFormTypes";

interface Props {
  form: ListingFormData;
  update: (key: string, value: any) => void;
  toggleLandmark: (l: string) => void;
  addCustomLandmark: () => void;
}

export default function StepExtras({ form, update, toggleLandmark, addCustomLandmark }: Props) {
  return (
    <div className="space-y-6">
      {/* Student Discount */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-primary mb-1">
          <GraduationCap className="w-5 h-5" />
          <span className="font-semibold text-foreground">Student Discount</span>
        </div>
        <div className="flex items-center gap-3">
          <Switch checked={form.studentDiscount} onCheckedChange={(v) => update("studentDiscount", v)} />
          <Label>Offer a student discount</Label>
        </div>
        {form.studentDiscount && (
          <div className="space-y-3 pl-1 border-l-2 border-primary/20 ml-2">
            <div className="pl-3">
              <Label>Discount (%)</Label>
              <Input type="number" min="1" max="50" value={form.studentDiscountPercent} onChange={(e) => update("studentDiscountPercent", e.target.value)} className="max-w-[120px]" />
            </div>
            <div className="pl-3">
              <Label>Applicable universities (optional)</Label>
              <Input value={form.studentUniversities} onChange={(e) => update("studentUniversities", e.target.value)} placeholder="e.g. McGill, UdeM, Concordia — leave blank for all" />
              <p className="text-xs text-muted-foreground mt-1">Comma-separated. Leave empty to apply to all students.</p>
            </div>
          </div>
        )}
      </div>

      {/* Nearby Landmarks */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-primary mb-1">
          <Landmark className="w-5 h-5" />
          <span className="font-semibold text-foreground">Nearby Landmarks & Destinations</span>
        </div>
        <p className="text-sm text-muted-foreground">Help seekers find your space by tagging nearby destinations.</p>
        <div className="flex flex-wrap gap-2">
          {COMMON_LANDMARKS.map((l) => (
            <Badge key={l} variant={form.nearbyLandmarks.includes(l) ? "default" : "outline"} className="cursor-pointer" onClick={() => toggleLandmark(l)}>{l}</Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={form.customLandmark}
            onChange={(e) => update("customLandmark", e.target.value)}
            placeholder="Add a custom landmark…"
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomLandmark())}
          />
          <Button type="button" variant="outline" size="sm" onClick={addCustomLandmark} disabled={!form.customLandmark.trim()}>Add</Button>
        </div>
        {form.nearbyLandmarks.filter((l) => !COMMON_LANDMARKS.includes(l)).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {form.nearbyLandmarks.filter((l) => !COMMON_LANDMARKS.includes(l)).map((l) => (
              <Badge key={l} variant="default" className="gap-1">
                {l}
                <X className="w-3 h-3 cursor-pointer" onClick={() => toggleLandmark(l)} />
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
