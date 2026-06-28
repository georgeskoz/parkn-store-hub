import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const CACHE_KEY = "spotsvault_maintenance_cache";
const TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  value: boolean;
  ts: number;
}

function readCache(): CacheEntry | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (Date.now() - parsed.ts > TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(value: boolean) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ value, ts: Date.now() }));
  } catch {}
}

export function useMaintenanceMode(): boolean {
  const cached = readCache();
  const [enabled, setEnabled] = useState<boolean>(cached?.value ?? false);

  useEffect(() => {
    if (cached) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("platform_settings")
          .select("value")
          .eq("key", "maintenance_mode")
          .maybeSingle();
        if (cancelled) return;
        if (error) {
          writeCache(false);
          return;
        }
        const isOn = data?.value === "true";
        writeCache(isOn);
        setEnabled(isOn);
      } catch {
        writeCache(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return enabled;
}
