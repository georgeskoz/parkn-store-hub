import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ListChecks } from "lucide-react";
import type { ListingFormData } from "./ListingFormTypes";
import { PARKING_FEATURES, STORAGE_FEATURES, AVAILABILITY_OPTIONS, getFeatureLabel } from "./ListingFormTypes";

interface Props {
  form: ListingFormData;
  update: (key: string, value: any) => void;
  toggleFeature: (f: string) => void;
}

export default function StepDetails({ form, update, toggleFeature }: Props) {
  const { t } = useTranslation();
  const featureOptions = form.category === "parking" ? PARKING_FEATURES : STORAGE_FEATURES;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-primary mb-2">
        <ListChecks className="w-5 h-5" />
        <span className="font-semibold text-foreground">{t("listingWizard.detailsAndFeatures")}</span>
      </div>

      <div>
        <Label>{t("search.type")}</Label>
        <Select value={form.type} onValueChange={(v) => update("type", v)}>
          <SelectTrigger><SelectValue placeholder={t("listingWizard.selectType")} /></SelectTrigger>
          <SelectContent>
            {form.category === "parking"
              ? (["outdoor", "indoor", "covered", "underground"] as const).map((pt) => <SelectItem key={pt} value={pt} className="capitalize">{t(`search.parkingType.${pt}`)}</SelectItem>)
              : (["indoor", "outdoor", "heated", "climate-controlled"] as const).map((st) => <SelectItem key={st} value={st} className="capitalize">{t(`storageListings.storageType.${st}`)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>{t("common.description")}</Label>
        <Textarea
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          rows={5}
          placeholder={t("listingWizard.descriptionPlaceholder")}
        />
        <p className="text-xs text-muted-foreground mt-1">{t("listingWizard.descriptionHint")}</p>
      </div>

      {form.category === "parking" && (
        <div>
          <Label>{t("listingWizard.availableSpots")}</Label>
          <Input type="number" min="1" value={form.spots} onChange={(e) => update("spots", e.target.value)} />
        </div>
      )}

      {form.category === "storage" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{t("listingWizard.dimensions")}</Label>
            <Input value={form.size} onChange={(e) => update("size", e.target.value)} placeholder="10x20" />
          </div>
          <div>
            <Label>{t("listingWizard.totalSqft")}</Label>
            <Input type="number" value={form.sqft} onChange={(e) => update("sqft", e.target.value)} placeholder="200" />
          </div>
        </div>
      )}

      <div>
        <Label>{t("listingWizard.featuresAndAmenities")}</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {featureOptions.map((f) => (
            <Badge key={f} variant={form.features.includes(f) ? "default" : "outline"} className="cursor-pointer" onClick={() => toggleFeature(f)}>
              {getFeatureLabel(t, f)}
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <Label>{t("listingWizard.availability")}</Label>
        <Select value={form.availability} onValueChange={(v) => update("availability", v)}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            {AVAILABILITY_OPTIONS.map((a) => (
              <SelectItem key={a} value={a} className="capitalize">
                {a === "available" ? t("listingCard.available") : t(`listingCard.availability.${a}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
