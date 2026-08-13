import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getIntlLocale } from "@/lib/dateLocale";
import StarRating from "./StarRating";
import ReviewForm from "./ReviewForm";

interface BookingRow {
  id: string;
  listing_id: string;
  host_id: string;
  end_date: string;
  listings: { title: string } | null;
}

interface ReviewRow {
  id: string;
  booking_id: string;
  rating: number;
  comment: string | null;
  submitted_at: string;
}

export default function SeekerReviewsPanel() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [reviewsByBooking, setReviewsByBooking] = useState<Record<string, ReviewRow>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data: bks } = await supabase
      .from("bookings")
      // provider_id/seeker_id don't exist on this table in production --
      // host_id/renter_id are the real columns (verified directly).
      .select("id, listing_id, host_id, end_date, listings(title)")
      .eq("renter_id", user.id)
      .eq("status", "completed")
      .order("end_date", { ascending: false });

    const rows = (bks || []) as unknown as BookingRow[];
    setBookings(rows);

    if (rows.length) {
      const { data: revs } = await supabase
        .from("reviews")
        .select("id, booking_id, rating, comment, submitted_at")
        .in("booking_id", rows.map((b) => b.id));
      const map: Record<string, ReviewRow> = {};
      (revs || []).forEach((r: any) => { map[r.booking_id] = r; });
      setReviewsByBooking(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  if (loading) return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>;
  if (!bookings.length) {
    return (
      <Card className="card-shadow">
        <CardContent className="py-8 text-center text-muted-foreground">
          {t("reviews.noCompletedBookingsYet")}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {bookings.map((b) => {
        const existing = reviewsByBooking[b.id];
        return (
          <Card key={b.id} className="card-shadow">
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>{b.listings?.title || t("listingCard.listing")}</span>
                {existing && <Badge variant="secondary">{t("booking.reviewSubmitted")}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {existing ? (
                <div className="space-y-2">
                  <StarRating value={existing.rating} readOnly />
                  {existing.comment && <p className="text-sm text-foreground/90">{existing.comment}</p>}
                  <p className="text-xs text-muted-foreground">
                    {new Date(existing.submitted_at).toLocaleDateString(getIntlLocale())}
                  </p>
                </div>
              ) : (
                <ReviewForm
                  bookingId={b.id}
                  listingId={b.listing_id}
                  revieweeId={b.host_id}
                  reviewerId={user!.id}
                  onSubmitted={load}
                />
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
