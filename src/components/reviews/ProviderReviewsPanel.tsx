import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { getIntlLocale } from "@/lib/dateLocale";
import StarRating from "./StarRating";

interface ReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  submitted_at: string;
  reviewer_id: string;
  listing_id: string;
  reviewer?: { display_name: string | null } | null;
  listing?: { title: string } | null;
}

export default function ProviderReviewsPanel() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("reviews")
        .select("id, rating, comment, submitted_at, reviewer_id, listing_id")
        .eq("reviewee_id", user.id)
        .eq("visible", true)
        .order("submitted_at", { ascending: false });

      const rows = (data || []) as ReviewRow[];
      const reviewerIds = Array.from(new Set(rows.map((r) => r.reviewer_id)));
      const listingIds = Array.from(new Set(rows.map((r) => r.listing_id)));

      if (reviewerIds.length) {
        const { data: profs } = await (supabase as any)
          .from("profiles_public").select("id, display_name").in("id", reviewerIds);
        const m = new Map((profs || []).map((p: any) => [p.id, p]));
        rows.forEach((r) => { r.reviewer = m.get(r.reviewer_id) as any; });
      }
      if (listingIds.length) {
        const { data: ls } = await supabase
          .from("listings").select("id, title").in("id", listingIds);
        const m = new Map((ls || []).map((l: any) => [l.id, l]));
        rows.forEach((r) => { r.listing = m.get(r.listing_id) as any; });
      }

      setReviews(rows);
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>;

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <div className="space-y-4">
      <Card className="card-shadow">
        <CardContent className="py-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{t("reviews.averageRating")}</p>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-4xl font-bold text-foreground">{avg.toFixed(1)}</p>
              <StarRating value={avg} readOnly size={22} />
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">{t("reviews.totalReviews")}</p>
            <p className="text-3xl font-bold text-foreground">{reviews.length}</p>
          </div>
        </CardContent>
      </Card>

      {reviews.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">{t("reviews.noReviewsYet")}</CardContent></Card>
      ) : (
        reviews.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{r.reviewer?.display_name || t("reviews.anonymous")}</p>
                  <p className="text-xs text-muted-foreground">{r.listing?.title}</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(r.submitted_at).toLocaleDateString(getIntlLocale())}
                </span>
              </div>
              <StarRating value={r.rating} readOnly size={16} />
              {r.comment && <p className="text-sm text-foreground/90">{r.comment}</p>}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
