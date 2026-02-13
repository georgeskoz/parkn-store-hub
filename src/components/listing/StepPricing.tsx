import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign } from "lucide-react";
import type { ListingFormData } from "./ListingFormTypes";

interface Props {
  form: ListingFormData;
  update: (key: string, value: any) => void;
}

export default function StepPricing({ form, update }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-primary mb-2">
        <DollarSign className="w-5 h-5" />
        <span className="font-semibold text-foreground">Pricing</span>
      </div>

      {form.category === "parking" && (
        <div className="grid grid-cols-3 gap-3">
          <div><Label>Hourly ($)</Label><Input type="number" value={form.hourly} onChange={(e) => update("hourly", e.target.value)} /></div>
          <div><Label>Daily ($)</Label><Input type="number" value={form.daily} onChange={(e) => update("daily", e.target.value)} /></div>
          <div><Label>Monthly ($)</Label><Input type="number" value={form.monthly} onChange={(e) => update("monthly", e.target.value)} /></div>
        </div>
      )}

      {form.category === "storage" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Daily ($)</Label><Input type="number" value={form.daily} onChange={(e) => update("daily", e.target.value)} /></div>
            <div><Label>Weekly ($)</Label><Input type="number" value={form.weekly} onChange={(e) => update("weekly", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Monthly ($)</Label><Input type="number" value={form.monthly} onChange={(e) => update("monthly", e.target.value)} /></div>
            <div><Label>Seasonal / 4-mo ($)</Label><Input type="number" value={form.seasonal} onChange={(e) => update("seasonal", e.target.value)} /></div>
          </div>
          <div>
            <Label>Cancellation Policy</Label>
            <Select value={form.cancellation} onValueChange={(v) => update("cancellation", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="flexible">Flexible</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="strict">Strict</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      <p className="text-xs text-muted-foreground">Prices in CAD. Quebec taxes (GST 5% + QST 9.975%) will be added at checkout.</p>
    </div>
  );
}
