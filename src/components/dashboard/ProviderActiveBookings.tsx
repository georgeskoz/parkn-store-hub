import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, Star } from "lucide-react";
import ReviewSubmissionModal from "@/components/reviews/ReviewSubmissionModal";
import DisputeControl from "@/components/disputes/DisputeControl";
import { useDisputes } from "@/hooks/useDisputes";
import BookingIntakeDetails, { hasBookingIntake } from "@/components/booking/BookingIntakeDetails";

type Ext = {
  id: string;
  booking_id: string;
  extra_hours: number;
  extra_amount: number;
  new_end_date: string;
  status: string;
  created_at: string;
};

type Booking = {
  id: string;
  listing_id: string;
  seeker_id: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  status: string;
  city: string | null;
  category: string | null;
  escrow_status: string | null;
  overdue_charges_total: number | null;
  completed_by_provider_at: string | null;
  completed_by_seeker_at: string | null;
  released_at: string | null;
  updated_at: string | null;
  vehicle_plate: string | null;
  vehicle_type: string | null;
  vehicle_make: string | null;
  vehicle_colour: string | null;
  drivers_license: string | null;
  license_province_state: string | null;
  storage_items: Record<string, number> | null;
  storage_notes: string | null;
  storage_size: string | null;
  dropoff_date: string | null;
  dropoff_time: string | null;
  listings?: { title: string | null } | null;
};

const REVIEW_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

const ProviderActiveBookings = ({ userId }: { userId: string }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [extensions, setExtensions] = useState<Ext[]>([]);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const { disputes, reload: reloadDisputes } = useDisputes(bookings.map((b) => b.id));

  const load = async () => {
    setLoading(true);
    const [{ data: bks }, { data: exts }] = await Promise.all([
      supabase
        .from("bookings")
        .select(
          "id,listing_id,seeker_id,start_date,end_date,total_amount,status,city,category,escrow_status,overdue_charges_total,completed_by_provider_at,completed_by_seeker_at,released_at,updated_at,vehicle_plate,vehicle_type,vehicle_make,vehicle_colour,drivers_license,license_province_state,storage_items,storage_notes,storage_size,dropoff_date,dropoff_time,listings(title)",
        )
        .eq("provider_id", userId)
        .neq("status", "cancelled")
        .order("end_date", { ascending: false }),
      supabase
        .from("booking_extensions")
        .select("id,booking_id,extra_hours,extra_amount,new_end_date,status,created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
    ]);
    const list = (bks || []) as Booking[];
    setBookings(list);
    setExtensions((exts || []) as Ext[]);
    const completedIds = list.filter((b) => b.status === "completed").map((b) => b.id);
    if (completedIds.length) {
      const { data: revs } = await supabase
        .from("reviews")
        .select("booking_id")
        .eq("reviewer_id", userId)
        .in("booking_id", completedIds);
      setReviewedIds(new Set((revs || []).map((r: any) => r.booking_id)));
    } else {
      setReviewedIds(new Set());
    }
    setLoading(false);
  };

  useEffect(() => {
    if (userId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const completionTs = (b: Booking) => {
    const cs = [b.released_at, b.completed_by_provider_at, b.completed_by_seeker_at, b.updated_at]
      .filter(Boolean)
      .map((s) => new Date(s as string).getTime());
    return cs.length ? Math.max(...cs) : 0;
  };
  const reviewState = (b: Booking): "eligible" | "reviewed" | "expired" | "none" => {
    if (b.status !== "completed") return "none";
    if (reviewedIds.has(b.id)) return "reviewed";
    const ts = completionTs(b);
    if (!ts) return "none";
    return Date.now() - ts <= REVIEW_WINDOW_MS ? "eligible" : "expired";
  };


  const respond = async (ext: Ext, decision: "accept" | "decline") => {
    setBusy(ext.id);
    try {
      const { data, error } = await supabase.functions.invoke("respond-extension", {
        body: { extensionId: ext.id, decision },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast({
        title: decision === "accept" ? "Extension accepted" : "Extension declined",
        description:
          data?.status === "paid"
            ? `Charged $${ext.extra_amount.toFixed(2)} to customer.`
            : undefined,
      });
      await load();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const markComplete = async (b: Booking) => {
    setBusy(b.id);
    try {
      const { data, error } = await supabase.functions.invoke("complete-rental", {
        body: { bookingId: b.id, role: "provider" },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast({ title: "Marked complete" });
      await load();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const escrowBadge = (s: string | null) => {
    if (s === "held") return <Badge variant="secondary">Held in escrow</Badge>;
    if (s === "released") return <Badge>Paid out</Badge>;
    if (s === "disputed") return <Badge variant="destructive">Disputed</Badge>;
    return null;
  };

  return (
    <Card className="card-shadow">
      <CardHeader>
        <CardTitle className="text-lg">Hosted Bookings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {extensions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Pending extension requests</h4>
                {extensions.map((e) => (
                  <div
                    key={e.id}
                    className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border bg-muted/30"
                  >
                    <div className="text-sm">
                      +{e.extra_hours}h until {new Date(e.new_end_date).toLocaleString()}{" "}
                      • <strong>${Number(e.extra_amount).toFixed(2)} CAD</strong>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === e.id}
                        onClick={() => respond(e, "decline")}
                      >
                        Decline
                      </Button>
                      <Button
                        size="sm"
                        disabled={busy === e.id}
                        onClick={() => respond(e, "accept")}
                      >
                        Accept & charge
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {bookings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active bookings.</p>
            ) : (
              <div className="space-y-3">
                {bookings.map((b) => {
                  const overdue =
                    b.escrow_status === "held" &&
                    !b.completed_by_seeker_at &&
                    Date.now() > new Date(b.end_date).getTime();
                  return (
                    <div key={b.id} className="rounded-lg border p-3 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex-1 min-w-[180px]">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium capitalize">
                            {b.category || "booking"}
                          </span>
                          <Badge variant="outline" className="capitalize">
                            {b.status}
                          </Badge>
                          {escrowBadge(b.escrow_status)}
                          {overdue && <Badge variant="destructive">Customer overdue</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {b.city} •{" "}
                          {new Date(b.start_date).toLocaleDateString()} →{" "}
                          {new Date(b.end_date).toLocaleDateString()}
                        </p>
                        {Number(b.overdue_charges_total || 0) > 0 && (
                          <p className="text-xs mt-1">
                            Extra collected (2×): $
                            {Number(b.overdue_charges_total).toFixed(2)}
                          </p>
                        )}
                      </div>
                      <div className="text-right space-y-1">
                        <p className="font-semibold">
                          ${Number(b.total_amount).toFixed(2)}
                        </p>
                        {b.escrow_status === "held" && !b.completed_by_provider_at && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy === b.id}
                            onClick={() => markComplete(b)}
                          >
                            {overdue ? "Force complete (no-pickup)" : "Mark complete"}
                          </Button>
                        )}
                        {(() => {
                          const rs = reviewState(b);
                          if (rs === "eligible") {
                            return (
                              <Button size="sm" onClick={() => setReviewBooking(b)}>
                                <Star className="w-3.5 h-3.5 mr-1" /> Leave a Review
                              </Button>
                            );
                          }
                          if (rs === "reviewed") {
                            return (
                              <Button size="sm" variant="outline" disabled>
                                Review submitted ✓
                              </Button>
                            );
                          }
                          if (rs === "expired") {
                            return (
                              <span className="block text-xs text-muted-foreground">
                                Review period expired
                              </span>
                            );
                          }
                          return null;
                        })()}
                        <div className="pt-1 flex justify-end">
                          <DisputeControl
                            bookingId={b.id}
                            bookingStatus={b.status}
                            endDate={b.end_date}
                            userId={userId}
                            dispute={disputes[b.id] || null}
                            onSubmitted={() => {
                              reloadDisputes();
                              load();
                            }}
                          />
                        </div>
                      </div>
                      </div>
                      {hasBookingIntake(b) && <BookingIntakeDetails booking={b} />}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </CardContent>

      {reviewBooking && (
        <ReviewSubmissionModal
          open={!!reviewBooking}
          onOpenChange={(o) => !o && setReviewBooking(null)}
          bookingId={reviewBooking.id}
          listingId={reviewBooking.listing_id}
          revieweeId={reviewBooking.seeker_id}
          listingTitle={reviewBooking.listings?.title || undefined}
          onSubmitted={load}
        />
      )}
    </Card>
  );
};

export default ProviderActiveBookings;
