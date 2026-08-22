import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type ReviewableBooking = {
  id: string;
  listing_id: string;
  counterparty_id: string;
  completed_at: string;
  listing_title?: string | null;
};

const WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

// released_at/completed_by_provider_at/completed_by_seeker_at were added by
// an earlier migration and are real, queryable columns now (confirmed live
// with real values). updated_at is the only one that's still missing from
// the real production `bookings` table (confirmed live: "column
// bookings.updated_at does not exist") -- left out of the select() below
// rather than guessed at.
const completionTimestamp = (b: any): string | null => {
  // Prefer released_at; fall back to latest of completed_by_*.
  const candidates = [b.released_at, b.completed_by_provider_at, b.completed_by_seeker_at]
    .filter(Boolean)
    .map((s: string) => new Date(s).getTime());
  if (!candidates.length) return null;
  return new Date(Math.max(...candidates)).toISOString();
};

export const useReviewableBookings = (
  userId: string | undefined,
  role: "seeker" | "provider",
) => {
  const { t } = useTranslation();
  const [bookings, setBookings] = useState<ReviewableBooking[]>([]);
  const [reviewedBookingIds, setReviewedBookingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // seeker_id/provider_id don't exist on this table in production --
      // renter_id/host_id are the real columns (verified directly).
      const ownCol = role === "seeker" ? "renter_id" : "host_id";
      const counterCol = role === "seeker" ? "host_id" : "renter_id";

      const { data: bks, error } = await supabase
        .from("bookings")
        .select(
          `id,listing_id,status,${ownCol},${counterCol},released_at,completed_by_provider_at,completed_by_seeker_at,listings(title)`,
        )
        .eq(ownCol, userId)
        .eq("status", "completed")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("useReviewableBookings load failed:", error);
        toast({
          title: t("booking.failed"),
          description: error.message,
          variant: "destructive",
        });
      }

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
