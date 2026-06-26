import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ReviewableBooking = {
  id: string;
  listing_id: string;
  counterparty_id: string;
  completed_at: string;
  listing_title?: string | null;
};

const WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

const completionTimestamp = (b: any): string | null => {
  // Prefer released_at; fall back to latest of completed_by_*; finally updated_at.
  const candidates = [b.released_at, b.completed_by_provider_at, b.completed_by_seeker_at, b.updated_at]
    .filter(Boolean)
    .map((s: string) => new Date(s).getTime());
  if (!candidates.length) return null;
  return new Date(Math.max(...candidates)).toISOString();
};

export const useReviewableBookings = (
  userId: string | undefined,
  role: "seeker" | "provider",
) => {
  const [bookings, setBookings] = useState<ReviewableBooking[]>([]);
  const [reviewedBookingIds, setReviewedBookingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const ownCol = role === "seeker" ? "seeker_id" : "provider_id";
      const counterCol = role === "seeker" ? "provider_id" : "seeker_id";

      const { data: bks } = await supabase
        .from("bookings")
        .select(
          `id,listing_id,status,${ownCol},${counterCol},released_at,updated_at,completed_by_provider_at,completed_by_seeker_at,listings(title)`,
        )
        .eq(ownCol, userId)
        .eq("status", "completed")
        .order("updated_at", { ascending: false });

      const cutoff = Date.now() - WINDOW_MS;
      const eligible: ReviewableBooking[] = (bks || [])
        .map((b: any) => {
          const ts = completionTimestamp(b);
          if (!ts) return null;
          if (new Date(ts).getTime() < cutoff) return null;
          return {
            id: b.id,
            listing_id: b.listing_id,
            counterparty_id: b[counterCol],
            completed_at: ts,
            listing_title: b.listings?.title || null,
          } as ReviewableBooking;
        })
        .filter(Boolean) as ReviewableBooking[];

      let reviewed = new Set<string>();
      if (eligible.length) {
        const { data: revs } = await supabase
          .from("reviews")
          .select("booking_id")
          .eq("reviewer_id", userId)
          .in(
            "booking_id",
            eligible.map((b) => b.id),
          );
        reviewed = new Set((revs || []).map((r: any) => r.booking_id));
      }

      setBookings(eligible);
      setReviewedBookingIds(reviewed);
    } finally {
      setLoading(false);
    }
  }, [userId, role]);

  useEffect(() => {
    load();
  }, [load]);

  const pending = bookings.filter((b) => !reviewedBookingIds.has(b.id));

  return { bookings, reviewedBookingIds, pending, loading, reload: load };
};
