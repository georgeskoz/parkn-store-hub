import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Plus, Trash2, Calendar, Clock } from "lucide-react";
import type { ListingFormData, AvailabilitySlot } from "./ListingFormTypes";
import { DAYS_OF_WEEK, MONTHS } from "./ListingFormTypes";

interface Props {
  form: ListingFormData;
  update: (key: string, value: any) => void;
}

export default function StepPricing({ form, update }: Props) {
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
        <span className="font-semibold text-foreground">Pricing</span>
      </div>

      {/* ============ PARKING ============ */}
      {form.category === "parking" && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <Label>Hourly ($)</Label>
              <Input type="number" value={form.hourly} onChange={(e) => update("hourly", e.target.value)} />
            </div>
            <div>
              <Label>Daily ($)</Label>
              <Input type="number" value={form.daily} onChange={(e) => update("daily", e.target.value)} />
            </div>
            <div>
              <Label>Weekly ($)</Label>
              <Input type="number" value={form.weekly} onChange={(e) => update("weekly", e.target.value)} />
            </div>
            <div>
              <Label>Monthly ($)</Label>
              <Input type="number" value={form.monthly} onChange={(e) => update("monthly", e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Vehicles that can park simultaneously</Label>
            <Select value={form.spots || "1"} onValueChange={(v) => update("spots", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 vehicle</SelectItem>
                <SelectItem value="2">2 vehicles</SelectItem>
                <SelectItem value="3">3 vehicles</SelectItem>
                <SelectItem value="4">4 vehicles</SelectItem>
                <SelectItem value="5">5+ vehicles</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Availability Schedule */}
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="font-semibold text-foreground text-sm">Availability Schedule</span>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={addSlot}>
                <Plus className="w-3 h-3 mr-1" /> Add slot
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Add one or more time slots per day. Example: Mon–Fri 8:00–18:00, or 20:00–08:00 for overnight parking.
            </p>

            {slots.length === 0 && (
              <p className="text-sm text-muted-foreground italic">
                No slots added — the spot will be considered available 24/7.
              </p>
            )}

            {slots.map((slot, idx) => (
              <div key={idx} className="border rounded-lg p-3 space-y-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Slot {idx + 1}</span>
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
                    <Label className="text-xs flex items-center gap-1"><Clock className="w-3 h-3" /> Start</Label>
                    <Input type="time" value={slot.startTime} onChange={(e) => updateSlot(idx, { startTime: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1"><Clock className="w-3 h-3" /> End</Label>
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
            <Label>Monthly ($)</Label>
            <Input type="number" value={form.monthly} onChange={(e) => update("monthly", e.target.value)} />
            <p className="text-xs text-muted-foreground mt-1">Storage spaces are typically rented by the month.</p>
          </div>

          <div>
            <Label>Number of units available</Label>
            <Select value={form.spots || "1"} onValueChange={(v) => update("spots", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 unit</SelectItem>
                <SelectItem value="2">2 units</SelectItem>
                <SelectItem value="3">3 units</SelectItem>
                <SelectItem value="4">4 units</SelectItem>
                <SelectItem value="5">5+ units</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Rental Period */}
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="font-semibold text-foreground text-sm">Rental Period</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Minimum rental</Label>
                <Select value={form.minMonths || "1"} onValueChange={(v) => update("minMonths", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 month</SelectItem>
                    <SelectItem value="3">3 months</SelectItem>
                    <SelectItem value="6">6 months</SelectItem>
                    <SelectItem value="12">12 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Available from</Label>
                <Input type="date" value={form.rentalStartDate} onChange={(e) => update("rentalStartDate", e.target.value)} />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm">Seasonal rental</Label>
                <p className="text-xs text-muted-foreground">e.g. November–April for winter storage</p>
              </div>
              <Switch checked={form.seasonalRental} onCheckedChange={(c) => update("seasonalRental", c)} />
            </div>

            {form.seasonalRental && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Season start</Label>
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
                  <Label>Season end</Label>
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
