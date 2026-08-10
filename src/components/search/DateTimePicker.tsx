import * as React from "react";
import { format, parseISO } from "date-fns";
import { useTranslation } from "react-i18next";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getDateFnsLocale } from "@/lib/dateLocale";

export type ParkingDateTime = { date?: string; start?: string; end?: string };
export type StorageDateTime = { checkin?: string; checkout?: string };
export type DateTimeValue = ParkingDateTime & StorageDateTime;

interface Props {
  mode: "parking" | "storage";
  value: DateTimeValue;
  onChange: (v: DateTimeValue) => void;
  className?: string;
  triggerClassName?: string;
  placeholder?: string;
}

const TIMES: string[] = (() => {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return out;
})();

function fmtTime(t?: string) {
  if (!t) return "";
  const [hh, mm] = t.split(":").map(Number);
  const ampm = hh >= 12 ? "pm" : "am";
  const h12 = ((hh + 11) % 12) + 1;
  return mm === 0 ? `${h12}${ampm}` : `${h12}:${String(mm).padStart(2, "0")}${ampm}`;
}

function fmtDate(d?: string) {
  if (!d) return "";
  try { return format(parseISO(d), "MMM d", { locale: getDateFnsLocale() }); } catch { return d; }
}

function formatLabel(mode: "parking" | "storage", v: DateTimeValue): string {
  if (mode === "parking") {
    if (!v.date) return "";
    const base = fmtDate(v.date);
    if (v.start && v.end) return `${base} · ${fmtTime(v.start)} – ${fmtTime(v.end)}`;
    return base;
  }
  if (v.checkin && v.checkout) return `${fmtDate(v.checkin)} – ${fmtDate(v.checkout)}`;
  if (v.checkin) return fmtDate(v.checkin);
  return "";
}

export default function DateTimePicker({
  mode,
  value,
  onChange,
  className,
  triggerClassName,
  placeholder,
}: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const label = formatLabel(mode, value);
  const effectivePlaceholder = placeholder ?? t("search.dateAndTime");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-2 px-4 py-3 rounded-lg bg-secondary/50 w-full text-left",
            triggerClassName,
          )}
        >
          <CalendarIcon className="w-5 h-5 text-muted-foreground shrink-0" />
          <span className={cn("text-sm truncate", label ? "text-foreground" : "text-muted-foreground")}>
            {label || effectivePlaceholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-auto p-0 pointer-events-auto", className)} align="start">
        {mode === "parking" ? (
          <ParkingPanel value={value} onChange={onChange} onDone={() => setOpen(false)} />
        ) : (
          <StoragePanel value={value} onChange={onChange} onDone={() => setOpen(false)} />
        )}
      </PopoverContent>
    </Popover>
  );
}

function ParkingPanel({ value, onChange, onDone }: { value: DateTimeValue; onChange: (v: DateTimeValue) => void; onDone: () => void }) {
  const { t } = useTranslation();
  const date = value.date ? parseISO(value.date) : undefined;
  const endOptions = React.useMemo(
    () => (value.start ? TIMES.filter((t) => t > value.start!) : TIMES),
    [value.start],
  );
  return (
    <div className="p-3 w-[20rem]">
      <Calendar
        mode="single"
        selected={date}
        onSelect={(d) => onChange({ ...value, date: d ? format(d, "yyyy-MM-dd") : undefined })}
        disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
        initialFocus
        className="pointer-events-auto"
      />
      <div className="grid grid-cols-2 gap-2 mt-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{t("search.startTime")}</label>
          <Select
            value={value.start || ""}
            onValueChange={(v) =>
              onChange({ ...value, start: v, end: value.end && v >= value.end ? undefined : value.end })
            }
          >
            <SelectTrigger><SelectValue placeholder={t("search.start")} /></SelectTrigger>
            <SelectContent className="max-h-64">
              {TIMES.map((time) => <SelectItem key={time} value={time}>{fmtTime(time)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{t("search.endTime")}</label>
          <Select value={value.end || ""} onValueChange={(v) => onChange({ ...value, end: v })} disabled={!value.start}>
            <SelectTrigger><SelectValue placeholder={t("search.end")} /></SelectTrigger>
            <SelectContent className="max-h-64">
              {endOptions.map((time) => <SelectItem key={time} value={time}>{fmtTime(time)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex justify-between mt-3">
        <Button variant="ghost" size="sm" onClick={() => onChange({})}>{t("common.clear")}</Button>
        <Button size="sm" onClick={onDone}>{t("common.done")}</Button>
      </div>
    </div>
  );
}

function StoragePanel({ value, onChange, onDone }: { value: DateTimeValue; onChange: (v: DateTimeValue) => void; onDone: () => void }) {
  const { t } = useTranslation();
  const from = value.checkin ? parseISO(value.checkin) : undefined;
  const to = value.checkout ? parseISO(value.checkout) : undefined;
  return (
    <div className="p-3">
      <Calendar
        mode="range"
        selected={{ from, to }}
        onSelect={(r: any) =>
          onChange({
            ...value,
            checkin: r?.from ? format(r.from, "yyyy-MM-dd") : undefined,
            checkout: r?.to ? format(r.to, "yyyy-MM-dd") : undefined,
          })
        }
        disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
        numberOfMonths={1}
        initialFocus
        className="pointer-events-auto"
      />
      <div className="flex justify-between mt-3">
        <Button variant="ghost" size="sm" onClick={() => onChange({})}>{t("common.clear")}</Button>
        <Button size="sm" onClick={onDone}>{t("common.done")}</Button>
      </div>
    </div>
  );
}

// ---- URL <-> value helpers ----
export function readDateTimeFromParams(params: URLSearchParams, mode: "parking" | "storage"): DateTimeValue {
  if (mode === "parking") {
    return {
      date: params.get("date") || undefined,
      start: params.get("start") || undefined,
      end: params.get("end") || undefined,
    };
  }
  return {
    checkin: params.get("checkin") || undefined,
    checkout: params.get("checkout") || undefined,
  };
}

export function writeDateTimeToParams(params: URLSearchParams, mode: "parking" | "storage", v: DateTimeValue) {
  const keys = mode === "parking" ? ["date", "start", "end"] as const : ["checkin", "checkout"] as const;
  keys.forEach((k) => {
    const val = (v as any)[k];
    if (val) params.set(k, val); else params.delete(k);
  });
}
