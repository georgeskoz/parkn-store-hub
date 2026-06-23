import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, CalendarDays, Clock, Ban, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const DAYS = [
  { idx: 1, label: "Monday", short: "Mon" },
  { idx: 2, label: "Tuesday", short: "Tue" },
  { idx: 3, label: "Wednesday", short: "Wed" },
  { idx: 4, label: "Thursday", short: "Thu" },
  { idx: 5, label: "Friday", short: "Fri" },
  { idx: 6, label: "Saturday", short: "Sat" },
  { idx: 0, label: "Sunday", short: "Sun" },
];

// 30-min options "HH:MM"
const TIME_OPTIONS = (() => {
  const arr: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      arr.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  arr.push("24:00");
  return arr;
})();

const fmtTimeLabel = (t: string) => {
  if (t === "24:00") return "12:00 AM (next)";
  const [h, m] = t.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return format(d, "h:mm a");
};

type DayRow = { enabled: boolean; start: string; end: string };

const emptySchedule = (): Record<number, DayRow> => {
  const o: Record<number, DayRow> = {};
  for (const d of DAYS) o[d.idx] = { enabled: false, start: "09:00", end: "17:00" };
  return o;
};

interface Props {
  listingId: string;
}

export default function AvailabilityEditor({ listingId }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [savingSched, setSavingSched] = useState(false);
  const [savingBlocks, setSavingBlocks] = useState(false);

  const [schedule, setSchedule] = useState<Record<number, DayRow>>(emptySchedule());
  const [bulkStart, setBulkStart] = useState("09:00");
  const [bulkEnd, setBulkEnd] = useState("17:00");

  const [viewMonth, setViewMonth] = useState<Date>(new Date());
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const [pendingAdd, setPendingAdd] = useState<Set<string>>(new Set());
  const [pendingRemove, setPendingRemove] = useState<Set<string>>(new Set());
  const [bookedDates, setBookedDates] = useState<Set<string>>(new Set());

  // Load all data
  useEffect(() => {
    if (!listingId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [slotsRes, blocksRes, bookingsRes] = await Promise.all([
          supabase.from("listing_availability_slots").select("*").eq("listing_id", listingId),
          (supabase as any).from("listing_blocked_dates").select("blocked_date").eq("listing_id", listingId),
          supabase.from("bookings").select("start_date,end_date,escrow_status,status").eq("listing_id", listingId),
        ]);
        if (cancelled) return;

        const sched = emptySchedule();
        for (const s of (slotsRes.data || []) as any[]) {
          const day = s.day_of_week as number;
          if (sched[day]) {
            sched[day] = {
              enabled: true,
              start: String(s.start_time || "09:00").slice(0, 5),
              end: String(s.end_time || "17:00").slice(0, 5),
            };
          }
        }
        setSchedule(sched);

        const b = new Set<string>();
        for (const r of (blocksRes.data || []) as any[]) b.add(String(r.blocked_date).slice(0, 10));
        setBlocked(b);

        const booked = new Set<string>();
        for (const bk of (bookingsRes.data || []) as any[]) {
          if (bk.status === "cancelled") continue;
          if (!["held", "released", "completed", "pending"].includes(bk.escrow_status)) continue;
          const start = new Date(bk.start_date);
          const end = new Date(bk.end_date);
          const cur = new Date(start);
          cur.setHours(0, 0, 0, 0);
          const endDay = new Date(end);
          endDay.setHours(0, 0, 0, 0);
          while (cur <= endDay) {
            booked.add(format(cur, "yyyy-MM-dd"));
            cur.setDate(cur.getDate() + 1);
          }
        }
        setBookedDates(booked);
      } catch (err: any) {
        toast({ title: "Failed to load availability", description: err.message, variant: "destructive" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listingId]);

  const updateDay = (idx: number, patch: Partial<DayRow>) =>
    setSchedule((p) => ({ ...p, [idx]: { ...p[idx], ...patch } }));

  const applyToAll = () => {
    setSchedule((p) => {
      const next = { ...p };
      for (const d of DAYS) {
        next[d.idx] = { ...next[d.idx], enabled: true, start: bulkStart, end: bulkEnd };
      }
      return next;
    });
    toast({ title: "Applied to all days", description: `${fmtTimeLabel(bulkStart)} – ${fmtTimeLabel(bulkEnd)}` });
  };

  const saveSchedule = async () => {
    setSavingSched(true);
    try {
      // Validate
      for (const d of DAYS) {
        const row = schedule[d.idx];
        if (row.enabled) {
          const sm = parseInt(row.start.replace(":", ""));
          const em = row.end === "24:00" ? 2400 : parseInt(row.end.replace(":", ""));
          if (em <= sm) throw new Error(`${d.label}: closing time must be after opening time`);
        }
      }

      await supabase.from("listing_availability_slots").delete().eq("listing_id", listingId);
      const rows = DAYS.filter((d) => schedule[d.idx].enabled).map((d) => ({
        listing_id: listingId,
        day_of_week: d.idx,
        start_time: schedule[d.idx].start,
        end_time: schedule[d.idx].end === "24:00" ? "23:59:59" : schedule[d.idx].end,
      }));
      if (rows.length > 0) {
        const { error } = await supabase.from("listing_availability_slots").insert(rows);
        if (error) throw error;
      }
      toast({ title: "Weekly schedule saved" });
    } catch (err: any) {
      toast({ title: "Could not save schedule", description: err.message, variant: "destructive" });
    } finally {
      setSavingSched(false);
    }
  };

  const toggleBlockDay = (d: Date) => {
    const key = format(d, "yyyy-MM-dd");
    if (bookedDates.has(key)) return; // can't block booked
    // Determine current effective state
    const isCurrentlyBlocked =
      (blocked.has(key) && !pendingRemove.has(key)) || pendingAdd.has(key);

    if (isCurrentlyBlocked) {
      // Unblock
      if (pendingAdd.has(key)) {
        const next = new Set(pendingAdd);
        next.delete(key);
        setPendingAdd(next);
      } else {
        const next = new Set(pendingRemove);
        next.add(key);
        setPendingRemove(next);
      }
    } else {
      if (pendingRemove.has(key)) {
        const next = new Set(pendingRemove);
        next.delete(key);
        setPendingRemove(next);
      } else {
        const next = new Set(pendingAdd);
        next.add(key);
        setPendingAdd(next);
      }
    }
  };

  const saveBlocks = async () => {
    setSavingBlocks(true);
    try {
      if (pendingAdd.size > 0) {
        const rows = Array.from(pendingAdd).map((d) => ({ listing_id: listingId, blocked_date: d }));
        const { error } = await (supabase as any).from("listing_blocked_dates").insert(rows);
        if (error) throw error;
      }
      if (pendingRemove.size > 0) {
        const { error } = await (supabase as any)
          .from("listing_blocked_dates")
          .delete()
          .eq("listing_id", listingId)
          .in("blocked_date", Array.from(pendingRemove));
        if (error) throw error;
      }
      const next = new Set(blocked);
      pendingAdd.forEach((d) => next.add(d));
      pendingRemove.forEach((d) => next.delete(d));
      setBlocked(next);
      setPendingAdd(new Set());
      setPendingRemove(new Set());
      toast({ title: "Blocked dates saved" });
    } catch (err: any) {
      toast({ title: "Could not save blocked dates", description: err.message, variant: "destructive" });
    } finally {
      setSavingBlocks(false);
    }
  };

  const modifiers = useMemo(() => {
    const blockedArr: Date[] = [];
    const openArr: Date[] = [];
    const bookedArr: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const horizon = new Date(today);
    horizon.setMonth(horizon.getMonth() + 6);
    const cur = new Date(today);
    while (cur <= horizon) {
      const key = format(cur, "yyyy-MM-dd");
      const dt = new Date(cur);
      if (bookedDates.has(key)) {
        bookedArr.push(dt);
      } else {
        const isBlocked = (blocked.has(key) && !pendingRemove.has(key)) || pendingAdd.has(key);
        if (isBlocked) blockedArr.push(dt);
        else openArr.push(dt);
      }
      cur.setDate(cur.getDate() + 1);
    }
    return { blocked: blockedArr, open: openArr, booked: bookedArr };
  }, [blocked, pendingAdd, pendingRemove, bookedDates]);

  const hasBlockChanges = pendingAdd.size > 0 || pendingRemove.size > 0;

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Weekly recurring schedule */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground">Weekly recurring schedule</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Set which days you're open and your hours. Days that are off are unbookable.
        </p>

        <div className="rounded-lg border border-border p-3 bg-muted/30 flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[140px]">
            <Label className="text-xs">Bulk open</Label>
            <Select value={bulkStart} onValueChange={setBulkStart}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-64">
                {TIME_OPTIONS.filter((t) => t !== "24:00").map((t) => (
                  <SelectItem key={t} value={t}>{fmtTimeLabel(t)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <Label className="text-xs">Bulk close</Label>
            <Select value={bulkEnd} onValueChange={setBulkEnd}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-64">
                {TIME_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>{fmtTimeLabel(t)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="secondary" size="sm" onClick={applyToAll}>Apply to all days</Button>
        </div>

        <div className="space-y-2">
          {DAYS.map((d) => {
            const row = schedule[d.idx];
            return (
              <div
                key={d.idx}
                className={cn(
                  "flex flex-wrap items-center gap-3 rounded-lg border border-border p-3",
                  row.enabled ? "bg-background" : "bg-muted/40"
                )}
              >
                <div className="flex items-center gap-2 w-32">
                  <Switch checked={row.enabled} onCheckedChange={(v) => updateDay(d.idx, { enabled: v })} />
                  <span className="font-medium text-sm text-foreground">{d.label}</span>
                </div>
                {row.enabled ? (
                  <div className="flex flex-1 items-center gap-2 flex-wrap">
                    <Select value={row.start} onValueChange={(v) => updateDay(d.idx, { start: v })}>
                      <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-64">
                        {TIME_OPTIONS.filter((t) => t !== "24:00").map((t) => (
                          <SelectItem key={t} value={t}>{fmtTimeLabel(t)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-muted-foreground">to</span>
                    <Select value={row.end} onValueChange={(v) => updateDay(d.idx, { end: v })}>
                      <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-64">
                        {TIME_OPTIONS.map((t) => (
                          <SelectItem key={t} value={t}>{fmtTimeLabel(t)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground italic">Closed</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end">
          <Button onClick={saveSchedule} disabled={savingSched}>
            {savingSched ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            Save schedule
          </Button>
        </div>
      </section>

      {/* Blocked dates */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Ban className="w-4 h-4 text-destructive" />
          <h3 className="font-semibold text-foreground">Blocked dates</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Click a date to block or unblock it. Blocked dates override the weekly schedule. Booked dates are read-only.
        </p>

        <div className="rounded-lg border border-border bg-muted/30 p-3 flex flex-col items-center">
          <Calendar
            mode="single"
            month={viewMonth}
            onMonthChange={setViewMonth}
            onSelect={(d) => d && toggleBlockDay(d)}
            disabled={(d) => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              if (d < today) return true;
              return bookedDates.has(format(d, "yyyy-MM-dd"));
            }}
            modifiers={{
              blocked: modifiers.blocked,
              open: modifiers.open,
              booked: modifiers.booked,
            }}
            modifiersClassNames={{
              blocked: "bg-destructive/30 text-destructive font-semibold hover:bg-destructive/40",
              open: "bg-primary/15 text-foreground hover:bg-primary/30",
              booked: "bg-muted text-muted-foreground line-through",
            }}
            className="p-2 pointer-events-auto rounded-md bg-background"
          />
          <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground pt-2">
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-primary/30" /> Open</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-destructive/50" /> Blocked</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-muted-foreground/30" /> Booked</span>
          </div>
        </div>

        {hasBlockChanges && (
          <div className="text-xs text-muted-foreground">
            {pendingAdd.size > 0 && <span className="mr-3">+{pendingAdd.size} to block</span>}
            {pendingRemove.size > 0 && <span>−{pendingRemove.size} to unblock</span>}
          </div>
        )}

        <div className="flex justify-end gap-2">
          {hasBlockChanges && (
            <Button
              variant="ghost"
              onClick={() => { setPendingAdd(new Set()); setPendingRemove(new Set()); }}
              disabled={savingBlocks}
            >
              <Trash2 className="w-4 h-4 mr-1" /> Discard changes
            </Button>
          )}
          <Button onClick={saveBlocks} disabled={savingBlocks || !hasBlockChanges}>
            {savingBlocks ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            Save blocked dates
          </Button>
        </div>
      </section>
    </div>
  );
}
