import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Loader2, CalendarDays } from "lucide-react";
import { addMonths, format, startOfMonth } from "date-fns";

interface DayStatus {
  day: string;   // YYYY-MM-DD
  status: "open" | "partial" | "booked";
}

interface Props {
  listingId: string;
  selectedStart?: Date;
  selectedEnd?: Date;
  /** Months of data to fetch ahead of `viewMonth`. Default 6. */
  monthsAhead?: number;
  /** Called when user picks an open/partial start date. */
  onPickStart?: (date: Date) => void;
}

export default function StorageAvailabilityCalendar({
  listingId,
  selectedStart,
  selectedEnd,
  monthsAhead = 6,
  onPickStart,
}: Props) {
  const [viewMonth, setViewMonth] = useState<Date>(startOfMonth(new Date()));
  const [loading, setLoading] = useState(false);
  const [statusByDay, setStatusByDay] = useState<Record<string, DayStatus["status"]>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const start = format(startOfMonth(viewMonth), "yyyy-MM-dd");
        const end = format(addMonths(startOfMonth(viewMonth), monthsAhead), "yyyy-MM-dd");
        const { data, error } = await (supabase as any).rpc("get_daily_availability", {
          target_listing_id: listingId,
          range_start: start,
          range_end: end,
        });
        if (error) throw error;
        if (cancelled) return;
        const map: Record<string, DayStatus["status"]> = {};
        for (const row of (data || []) as DayStatus[]) {
          // PostgREST returns dates as YYYY-MM-DD strings
          map[String(row.day).slice(0, 10)] = row.status;
        }
        setStatusByDay(map);
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Failed to load availability");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listingId, viewMonth, monthsAhead]);

  const { bookedDates, partialDates, openDates } = useMemo(() => {
    const booked: Date[] = [];
    const partial: Date[] = [];
    const open: Date[] = [];
    for (const [d, s] of Object.entries(statusByDay)) {
      const dt = new Date(d + "T00:00:00");
      if (s === "booked") booked.push(dt);
      else if (s === "partial") partial.push(dt);
      else open.push(dt);
    }
    return { bookedDates: booked, partialDates: partial, openDates: open };
  }, [statusByDay]);

  const today = new Date(); today.setHours(0, 0, 0, 0);

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-foreground flex items-center gap-1">
          <CalendarDays className="w-3 h-3" /> Storage Availability
        </p>
        {loading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <Calendar
        mode="single"
        month={viewMonth}
        onMonthChange={setViewMonth}
        selected={selectedStart}
        onSelect={(d) => {
          if (!d) return;
          const key = format(d, "yyyy-MM-dd");
          if (statusByDay[key] === "booked") return;
          onPickStart?.(d);
        }}
        disabled={(d) => {
          if (d < today) return true;
          const key = format(d, "yyyy-MM-dd");
          return statusByDay[key] === "booked";
        }}
        modifiers={{
          booked: bookedDates,
          partial: partialDates,
          open: openDates,
          rangeEnd: selectedEnd ? [selectedEnd] : [],
        }}
        modifiersClassNames={{
          booked: "bg-destructive/30 text-destructive line-through",
          partial: "bg-amber-200/70 text-amber-900 dark:bg-amber-500/30 dark:text-amber-200",
          open: "bg-primary/15 text-foreground hover:bg-primary/30",
          rangeEnd: "ring-2 ring-primary",
        }}
        className="p-2 pointer-events-auto rounded-md bg-background"
      />

      <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground pt-1">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-primary/30" /> Open
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-amber-300 dark:bg-amber-500/60" /> Partial
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-destructive/50" /> Booked
        </span>
      </div>
    </div>
  );
}
