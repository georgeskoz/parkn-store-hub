import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type DisputeRow = {
  id: string;
  booking_id: string;
  raised_by: string;
  reason: string;
  description: string;
  evidence_urls: string[];
  status: "open" | "under_review" | "resolved_seeker" | "resolved_host" | "closed";
  admin_notes: string | null;
  resolved_at: string | null;
  created_at: string;
};

export const useDisputes = (bookingIds: string[]) => {
  const [map, setMap] = useState<Record<string, DisputeRow>>({});
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!bookingIds.length) {
      setMap({});
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("disputes")
        .select("*")
        .in("booking_id", bookingIds);
      if (error) throw error;
      const m: Record<string, DisputeRow> = {};
      (data || []).forEach((d: DisputeRow) => {
        m[d.booking_id] = d;
      });
      setMap(m);
    } catch {
      setMap({});
    } finally {
      setLoading(false);
    }
  }, [bookingIds.join("|")]);

  useEffect(() => {
    load();
  }, [load]);

  return { disputes: map, loading, reload: load };
};
