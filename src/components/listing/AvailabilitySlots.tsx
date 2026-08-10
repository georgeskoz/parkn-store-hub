import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Clock, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { getDateFnsLocale } from "@/lib/dateLocale";

export interface TimeRange {
  start: string; // "HH:MM"
  end: string;   // "HH:MM" or "24:00"
}

interface Props {
  listingId: string;
  date: Date | undefined;
  selectedStart?: string; // "HH:MM"
  selectedEnd?: string;   // "HH:MM"
  onPickSlot?: (slot: TimeRange) => void;
}

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

const fmtTime = (t: string) => {
  if (t === "24:00") return "12:00 AM";
  const [h, m] = t.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return format(d, "h:mm a", { locale: getDateFnsLocale() });
};

export function fitsInOpenWindow(
  windows: TimeRange[],
  startTime: string,
  endTime: string,
): boolean {
  const s = toMin(startTime);
  const e = toMin(endTime === "00:00" ? "24:00" : endTime);
  if (e <= s) return false;
  return windows.some((w) => toMin(w.start) <= s && toMin(w.end) >= e);
}

export default function AvailabilitySlots({
  listingId,
  date,
  selectedStart,
  selectedEnd,
  onPickSlot,
}: Props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState<TimeRange[]>([]);
  const [busy, setBusy] = useState<TimeRange[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const checkDate = format(date, "yyyy-MM-dd");
        const { data, error } = await (supabase as any).rpc(
          "get_available_slots",
          { _listing_id: listingId, _check_date: checkDate },
        );
        if (error) throw error;
        if (cancelled) return;
        setAvailable((data?.available || []) as TimeRange[]);
        setBusy((data?.busy || []) as TimeRange[]);
      } catch (err: any) {
        if (!cancelled) setError(err.message || t("availabilitySlots.failedToLoad"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listingId, date]);

  if (!date) return null;

  const hasBookings = busy.length > 0;
  const selectionFits =
    selectedStart && selectedEnd
      ? fitsInOpenWindow(available, selectedStart, selectedEnd)
      : true;

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" /> {t("availabilitySlots.availabilityFor", { date: format(date, "MMM d", { locale: getDateFnsLocale() }) })}
        </p>
        {loading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
      </div>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {!loading && !error && (
        <>
          {/* Timeline */}
          <div className="relative h-6 w-full rounded bg-primary/15 overflow-hidden">
            {busy.map((b, i) => {
              const left = (toMin(b.start) / 1440) * 100;
              const width = ((toMin(b.end) - toMin(b.start)) / 1440) * 100;
              return (
                <div
                  key={i}
                  className="absolute top-0 h-full bg-destructive/60"
                  style={{ left: `${left}%`, width: `${width}%` }}
                  title={t("availabilitySlots.booked", { start: fmtTime(b.start), end: fmtTime(b.end) })}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{t("availabilitySlots.time12am")}</span><span>{t("availabilitySlots.time6am")}</span><span>{t("availabilitySlots.time12pm")}</span><span>{t("availabilitySlots.time6pm")}</span><span>{t("availabilitySlots.time12am")}</span>
          </div>

          {hasBookings ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground">
                {t("availabilitySlots.availableSlotsOpenForRent")}
              </p>
              {available.length === 0 ? (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {t("availabilitySlots.fullyBooked")}
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {available.map((w, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onPickSlot?.(w)}
                      className="text-[11px] px-2 py-1 rounded-full border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary font-medium transition-colors"
                    >
                      {fmtTime(w.start)} – {fmtTime(w.end)}
                    </button>
                  ))}
                </div>
              )}
              {busy.length > 0 && (
                <div className="pt-1">
                  <p className="text-[11px] text-muted-foreground mb-1">{t("availabilitySlots.alreadyBooked")}</p>
                  <div className="flex flex-wrap gap-1">
                    {busy.map((b, i) => (
                      <Badge key={i} variant="outline" className="text-[10px] line-through text-muted-foreground">
                        {fmtTime(b.start)} – {fmtTime(b.end)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-primary flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> {t("availabilitySlots.fullyAvailableAllDay")}
            </p>
          )}

          {selectedStart && selectedEnd && !selectionFits && (
            <p className="text-xs text-destructive flex items-center gap-1 border-t border-border pt-2">
              <AlertCircle className="w-3 h-3" />
              {t("availabilitySlots.selectionOverlaps", { start: fmtTime(selectedStart), end: fmtTime(selectedEnd) })}
            </p>
          )}
        </>
      )}
    </div>
  );
}
