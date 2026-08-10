import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { GraduationCap, Landmark, X } from "lucide-react";
import type { ListingFormData } from "./ListingFormTypes";
import { COMMON_LANDMARKS, getLandmarkLabel } from "./ListingFormTypes";

interface Props {
  form: ListingFormData;
  update: (key: string, value: any) => void;
  toggleLandmark: (l: string) => void;
  addCustomLandmark: () => void;
}

export default function StepExtras({ form, update, toggleLandmark, addCustomLandmark }: Props) {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      {/* Student Discount */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-primary mb-1">
          <GraduationCap className="w-5 h-5" />
          <span className="font-semibold text-foreground">{t("listingWizard.studentDiscount")}</span>
        </div>
        <div className="flex items-center gap-3">
          <Switch checked={form.studentDiscount} onCheckedChange={(v) => update("studentDiscount", v)} />
          <Label>{t("listingWizard.offerStudentDiscount")}</Label>
        </div>
        {form.studentDiscount && (
          <div className="space-y-3 pl-1 border-l-2 border-primary/20 ml-2">
            <div className="pl-3">
              <Label>{t("listingWizard.discountPercent")}</Label>
              <Input type="number" min="1" max="50" value={form.studentDiscountPercent} onChange={(e) => update("studentDiscountPercent", e.target.value)} className="max-w-[120px]" />
            </div>
            <div className="pl-3">
              <Label>{t("listingWizard.applicableUniversities")}</Label>
              <Input value={form.studentUniversities} onChange={(e) => update("studentUniversities", e.target.value)} placeholder={t("listingWizard.applicableUniversitiesPlaceholder")} />
              <p className="text-xs text-muted-foreground mt-1">{t("listingWizard.commaSeparatedHint")}</p>
            </div>
          </div>
        )}
      </div>

      {/* Nearby Landmarks */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-primary mb-1">
          <Landmark className="w-5 h-5" />
          <span className="font-semibold text-foreground">{t("listingWizard.nearbyLandmarksAndDestinations")}</span>
        </div>
        <p className="text-sm text-muted-foreground">{t("listingWizard.landmarksHint")}</p>
        <div className="flex flex-wrap gap-2">
          {COMMON_LANDMARKS.map((l) => (
            <Badge key={l} variant={form.nearbyLandmarks.includes(l) ? "default" : "outline"} className="cursor-pointer" onClick={() => toggleLandmark(l)}>{getLandmarkLabel(t, l)}</Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={form.customLandmark}
            onChange={(e) => update("customLandmark", e.target.value)}
            placeholder={t("listingWizard.addCustomLandmarkPlaceholder")}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomLandmark())}
          />
          <Button type="button" variant="outline" size="sm" onClick={addCustomLandmark} disabled={!form.customLandmark.trim()}>{t("listingWizard.add")}</Button>
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
