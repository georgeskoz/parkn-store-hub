import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import StarRating from "./StarRating";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  listingId: string;
  compact?: boolean;
}

interface ReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_id: string;
  profiles?: { display_name: string | null; avatar_url: string | null } | null;
}

export const useListingRatingSummary = (listingId: string) => {
  const [avg, setAvg] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data } = await supabase
        .from("reviews")
        .select("rating")
        .eq("listing_id", listingId)
        .eq("visible", true);
      if (cancel) return;
      const rows = data || [];
      setCount(rows.length);
      setAvg(rows.length ? rows.reduce((s, r: any) => s + r.rating, 0) / rows.length : 0);
    })();
    return () => { cancel = true; };
  }, [listingId]);

  return { avg, count };
};

export default function ListingReviews({ listingId }: Props) {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("reviews")
        .select("id, rating, comment, created_at, reviewer_id")
        .eq("listing_id", listingId)
        .eq("visible", true)
        .order("created_at", { ascending: false });

      const rows = (data || []) as ReviewRow[];
      // Fetch reviewer profiles
      const ids = Array.from(new Set(rows.map((r) => r.reviewer_id)));
      if (ids.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .in("id", ids);
        const map = new Map((profiles || []).map((p: any) => [p.id, p]));
        rows.forEach((r) => { r.profiles = map.get(r.reviewer_id) as any; });
      }
      setReviews(rows);
      setLoading(false);
    })();
  }, [listingId]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading reviews…</p>;

  if (reviews.length === 0) {
    return <p className="text-muted-foreground">No reviews yet — be the first!</p>;
  }

  return (
    <div className="space-y-3">
      {reviews.map((r) => (
        <Card key={r.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium text-foreground">{r.profiles?.display_name || "Anonymous"}</p>
              <span className="text-xs text-muted-foreground">
                {new Date(r.created_at).toLocaleDateString()}
              </span>
            </div>
            <StarRating value={r.rating} readOnly size={16} />
            {r.comment && <p className="mt-2 text-sm text-foreground/90">{r.comment}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
