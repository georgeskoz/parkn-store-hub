import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Plus, Trash2, Calendar, Clock } from "lucide-react";
import type { ListingFormData, AvailabilitySlot } from "./ListingFormTypes";
import { getTranslatedDaysOfWeek, getTranslatedMonths } from "./ListingFormTypes";

interface Props {
  form: ListingFormData;
  update: (key: string, value: any) => void;
}

export default function StepPricing({ form, update }: Props) {
  const { t } = useTranslation();
  const DAYS_OF_WEEK = getTranslatedDaysOfWeek(t);
  const MONTHS = getTranslatedMonths(t);
  const slots = form.availabilitySlots ?? [];

  const addSlot = () => {
    const newSlot: AvailabilitySlot = { dayOfWeek: 1, startTime: "08:00", endTime: "18:00" };
    update("availabilitySlots", [...slots, newSlot]);
  };
  const updateSlot = (idx: number, patch: Partial<AvailabilitySlot>) => {
    update(
      "availabilitySlots",
      slots.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    );
  };
  const removeSlot = (idx: number) => {
    update("availabilitySlots", slots.filter((_, i) => i !== idx));
  };
  const toggleDay = (slotIdx: number, day: number) => {
    // For simplicity, each slot has one day. If a slot already has that day, no-op; otherwise set it.
    updateSlot(slotIdx, { dayOfWeek: day });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-primary mb-2">
        <DollarSign className="w-5 h-5" />
        <span className="font-semibold text-foreground">{t("listingWizard.pricing")}</span>
      </div>

      {/* ============ PARKING ============ */}
      {form.category === "parking" && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <Label>{t("listingWizard.hourlyDollar")}</Label>
              <Input type="number" value={form.hourly} onChange={(e) => update("hourly", e.target.value)} />
            </div>
            <div>
              <Label>{t("listingWizard.dailyDollar")}</Label>
              <Input type="number" value={form.daily} onChange={(e) => update("daily", e.target.value)} />
            </div>
            <div>
              <Label>{t("listingWizard.weeklyDollar")}</Label>
              <Input type="number" value={form.weekly} onChange={(e) => update("weekly", e.target.value)} />
            </div>
            <div>
              <Label>{t("listingWizard.monthlyDollar")}</Label>
              <Input type="number" value={form.monthly} onChange={(e) => update("monthly", e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">{t("listingWizard.atLeastOneRateRequired")}</p>

          <div>
            <Label>{t("listingWizard.vehiclesSimultaneously")}</Label>
            <Select value={form.spots || "1"} onValueChange={(v) => update("spots", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">{t("listingWizard.vehicleCount_one", { count: 1 })}</SelectItem>
                <SelectItem value="2">{t("listingWizard.vehicleCount_other", { count: 2 })}</SelectItem>
                <SelectItem value="3">{t("listingWizard.vehicleCount_other", { count: 3 })}</SelectItem>
                <SelectItem value="4">{t("listingWizard.vehicleCount_other", { count: 4 })}</SelectItem>
                <SelectItem value="5">{t("listingWizard.vehicleCountPlus", { count: 5 })}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Availability Schedule */}
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="font-semibold text-foreground text-sm">{t("listingWizard.availabilitySchedule")}</span>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={addSlot}>
                <Plus className="w-3 h-3 mr-1" /> {t("listingWizard.addSlot")}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("listingWizard.availabilityScheduleHint")}
            </p>

            {slots.length === 0 && (
              <p className="text-sm text-muted-foreground italic">
                {t("listingWizard.noSlotsAdded")}
              </p>
            )}

            {slots.map((slot, idx) => (
              <div key={idx} className="border rounded-lg p-3 space-y-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">{t("listingWizard.slotNumber", { number: idx + 1 })}</span>
                  <Button type="button" size="sm" variant="ghost" onClick={() => removeSlot(idx)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((d, di) => (
                    <button
                      key={di}
                      type="button"
                      onClick={() => toggleDay(idx, di)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        slot.dayOfWeek === di
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground border-border hover:bg-muted"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs flex items-center gap-1"><Clock className="w-3 h-3" /> {t("search.start")}</Label>
                    <Input type="time" value={slot.startTime} onChange={(e) => updateSlot(idx, { startTime: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1"><Clock className="w-3 h-3" /> {t("search.end")}</Label>
                    <Input type="time" value={slot.endTime} onChange={(e) => updateSlot(idx, { endTime: e.target.value })} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ============ STORAGE ============ */}
      {form.category === "storage" && (
        <>
          <div>
            <Label>{t("listingWizard.monthlyDollar")}</Label>
            <Input type="number" value={form.monthly} onChange={(e) => update("monthly", e.target.value)} />
            <p className="text-xs text-muted-foreground mt-1">{t("listingWizard.storageRentedMonthlyHint")}</p>
          </div>

          <div>
            <Label>{t("listingWizard.numberOfUnitsAvailable")}</Label>
            <Select value={form.spots || "1"} onValueChange={(v) => update("spots", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">{t("listingWizard.unitCount_one", { count: 1 })}</SelectItem>
                <SelectItem value="2">{t("listingWizard.unitCount_other", { count: 2 })}</SelectItem>
                <SelectItem value="3">{t("listingWizard.unitCount_other", { count: 3 })}</SelectItem>
                <SelectItem value="4">{t("listingWizard.unitCount_other", { count: 4 })}</SelectItem>
                <SelectItem value="5">{t("listingWizard.unitCountPlus", { count: 5 })}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Rental Period */}
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="font-semibold text-foreground text-sm">{t("listingWizard.rentalPeriod")}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("listingWizard.minimumRental")}</Label>
                <Select value={form.minMonths || "1"} onValueChange={(v) => update("minMonths", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{t("listingDetail.unitsLabel.monthly", { count: 1 })}</SelectItem>
                    <SelectItem value="3">{t("listingDetail.unitsLabel.monthly", { count: 3 })}</SelectItem>
                    <SelectItem value="6">{t("listingDetail.unitsLabel.monthly", { count: 6 })}</SelectItem>
                    <SelectItem value="12">{t("listingDetail.unitsLabel.monthly", { count: 12 })}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("listingWizard.availableFrom")}</Label>
                <Input type="date" value={form.rentalStartDate} onChange={(e) => update("rentalStartDate", e.target.value)} />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm">{t("listingWizard.seasonalRental")}</Label>
                <p className="text-xs text-muted-foreground">{t("listingWizard.seasonalRentalHint")}</p>
              </div>
              <Switch checked={form.seasonalRental} onCheckedChange={(c) => update("seasonalRental", c)} />
            </div>

            {form.seasonalRental && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("listingWizard.seasonStart")}</Label>
                  <Select value={form.seasonStartMonth} onValueChange={(v) => update("seasonStartMonth", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m, i) => (
                        <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("listingWizard.seasonEnd")}</Label>
                  <Select value={form.seasonEndMonth} onValueChange={(v) => update("seasonEndMonth", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m, i) => (
                        <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <div>
            <Label>{t("listingWizard.cancellationPolicy")}</Label>
            <Select value={form.cancellation} onValueChange={(v) => update("cancellation", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="flexible">{t("listingWizard.cancellation.flexible")}</SelectItem>
                <SelectItem value="moderate">{t("listingWizard.cancellation.moderate")}</SelectItem>
                <SelectItem value="strict">{t("listingWizard.cancellation.strict")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      <p className="text-xs text-muted-foreground">{t("listingWizard.pricesInCadTaxHint")}</p>
    </div>
  );
}
