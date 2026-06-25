import { supabase } from "@/integrations/supabase/client";
import { addDays, parseISO } from "date-fns";

interface SlotRow { listing_id: string; day_of_week: number; start_time: string; end_time: string }
interface BlockRow { listing_id: string; blocked_date: string }

export interface ParkingWindow { date: string; start?: string; end?: string }
export interface StorageWindow { checkin: string; checkout: string }

async function fetchAvailability(listingIds: string[]) {
  if (listingIds.length === 0) return { slots: [] as SlotRow[], blocks: [] as BlockRow[] };
  const [slotsRes, blocksRes] = await Promise.all([
    (supabase as any).from("listing_availability_slots").select("listing_id,day_of_week,start_time,end_time").in("listing_id", listingIds),
    (supabase as any).from("listing_blocked_dates").select("listing_id,blocked_date").in("listing_id", listingIds),
  ]);
  return { slots: (slotsRes.data || []) as SlotRow[], blocks: (blocksRes.data || []) as BlockRow[] };
}

function groupBy<T, K extends string>(arr: T[], key: (t: T) => K): Record<K, T[]> {
  const out: any = {};
  for (const x of arr) {
    const k = key(x);
    (out[k] ||= []).push(x);
  }
  return out;
}

function timeToMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** Returns the subset of listingIds that are available for the given parking window. */
export async function filterParkingAvailable(listingIds: string[], win: ParkingWindow): Promise<Set<string>> {
  const { slots, blocks } = await fetchAvailability(listingIds);
  const slotsBy = groupBy(slots, (s) => s.listing_id);
  const blocksBy = groupBy(blocks, (b) => b.listing_id);
  const date = parseISO(win.date);
  const dow = date.getDay(); // 0=Sun..6=Sat
  const startMin = win.start ? timeToMin(win.start) : null;
  const endMin = win.end ? timeToMin(win.end) : null;

  const ok = new Set<string>();
  for (const id of listingIds) {
    const blocked = (blocksBy[id] || []).some((b) => b.blocked_date === win.date);
    if (blocked) continue;
    const daySlots = (slotsBy[id] || []).filter((s) => s.day_of_week === dow);
    // If no recurring slots configured at all, treat as always available.
    const hasAny = (slotsBy[id] || []).length > 0;
    if (hasAny && daySlots.length === 0) continue;
    if (startMin !== null && endMin !== null && hasAny) {
      const covered = daySlots.some(
        (s) => timeToMin(s.start_time) <= startMin && timeToMin(s.end_time) >= endMin,
      );
      if (!covered) continue;
    }
    ok.add(id);
  }
  return ok;
}

/** Returns the subset of listingIds available across the full storage date range. */
export async function filterStorageAvailable(listingIds: string[], win: StorageWindow): Promise<Set<string>> {
  const { slots, blocks } = await fetchAvailability(listingIds);
  const slotsBy = groupBy(slots, (s) => s.listing_id);
  const blocksBy = groupBy(blocks, (b) => b.listing_id);
  const start = parseISO(win.checkin);
  const end = parseISO(win.checkout);
  const days: { iso: string; dow: number }[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) {
    days.push({ iso: d.toISOString().slice(0, 10), dow: d.getDay() });
  }
  const ok = new Set<string>();
  for (const id of listingIds) {
    const blockedSet = new Set((blocksBy[id] || []).map((b) => b.blocked_date));
    const listingSlots = slotsBy[id] || [];
    const hasAny = listingSlots.length > 0;
    const openDows = new Set(listingSlots.map((s) => s.day_of_week));
    let good = true;
    for (const d of days) {
      if (blockedSet.has(d.iso)) { good = false; break; }
      if (hasAny && !openDows.has(d.dow)) { good = false; break; }
    }
    if (good) ok.add(id);
  }
  return ok;
}
