import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { getIntlLocale } from "@/lib/dateLocale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, Star, ChevronDown, ChevronUp } from "lucide-react";
import ReviewSubmissionModal from "@/components/reviews/ReviewSubmissionModal";
import DisputeControl from "@/components/disputes/DisputeControl";
import { useDisputes } from "@/hooks/useDisputes";
import BookingIntakeDetails, { hasBookingIntake } from "@/components/booking/BookingIntakeDetails";

type Booking = {
  id: string;
  listing_id: string;
  host_id: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  status: string;
  category: string | null;
  city: string | null;
  refund_amount: number | null;
  refund_status: string | null;
  cancelled_at: string | null;
  escrow_status: string | null;
  auto_release_at: string | null;
  // overdue_charges_total/completed_by_seeker_at/completed_by_provider_at/
  // released_at were added by an earlier migration and are real, queryable
  // columns now (confirmed live with real values). updated_at is the only
  // one that's still missing from the real production `bookings` table
  // (confirmed live: "column bookings.updated_at does not exist") -- left
  // out of the select() below rather than guessed at.
  overdue_charges_total: number | null;
  completed_by_seeker_at: string | null;
  completed_by_provider_at: string | null;
  released_at: string | null;
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

const CANCELLABLE = ["pending", "confirmed", "active"];

const escrowBadge = (s: string | null, t: (key: string) => string) => {
  switch (s) {
    case "held":
      return <Badge variant="secondary">{t("booking.escrow.held")}</Badge>;
    case "released":
      return <Badge>{t("booking.escrow.released")}</Badge>;
    case "disputed":
      return <Badge variant="destructive">{t("booking.escrow.disputed")}</Badge>;
    case "refunded":
      return <Badge variant="outline">{t("booking.escrow.refunded")}</Badge>;
    default:
      return null;
  }
};

const SeekerBookingsList = ({ userId }: { userId: string }) => {
  const { t } = useTranslation();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<Booking | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [extBooking, setExtBooking] = useState<Booking | null>(null);
  const [extHours, setExtHours] = useState(1);
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const { disputes, reload: reloadDisputes } = useDisputes(bookings.map((b) => b.id));
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setExpanded((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .select(
        "id,listing_id,host_id,start_date,end_date,total_amount,status,category,city,refund_amount,refund_status,cancelled_at,escrow_status,auto_release_at,overdue_charges_total,completed_by_seeker_at,completed_by_provider_at,released_at,vehicle_plate,vehicle_type,vehicle_make,vehicle_colour,drivers_license,license_province_state,storage_items,storage_notes,storage_size,dropoff_date,dropoff_time,listings(title)",
      )
      .eq("renter_id", userId)
      .order("start_date", { ascending: false });
    if (error) {
      console.error("SeekerBookingsList load failed:", error);
      toast({
        title: t("booking.failed"),
        description: error.message,
        variant: "destructive",
      });
    }
    const list = (data || []) as Booking[];
    setBookings(list);
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
    const cs = [b.released_at, b.completed_by_provider_at, b.completed_by_seeker_at]
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


  const refundPreview = (b: Booking) => {
    const hours = (new Date(b.start_date).getTime() - Date.now()) / 36e5;
    const pct = hours >= 24 ? 100 : hours > 0 ? 50 : 0;
    return { pct, amount: +(Number(b.total_amount) * (pct / 100)).toFixed(2) };
  };

  const confirmCancel = async () => {
    if (!target) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("cancel-booking", {
        body: { bookingId: target.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({
        title: t("booking.bookingCancelled"),
        description: data?.refundAmount
          ? t("booking.refundBeingProcessed", { amount: data.refundAmount.toFixed(2), percent: data.refundPercent })
          : t("booking.noRefundApplies"),
      });
      setTarget(null);
      await load();
    } catch (e: any) {
      toast({ title: t("booking.cancellationFailed"), description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const completePickup = async (b: Booking) => {
    try {
      const { data, error } = await supabase.functions.invoke("complete-rental", {
        body: { bookingId: b.id, role: "seeker" },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast({ title: t("booking.pickupConfirmed"), description: t("booking.fundsWillRelease") });
      await load();
    } catch (e: any) {
      toast({ title: t("booking.failed"), description: e.message, variant: "destructive" });
    }
  };

  const submitExtension = async () => {
    if (!extBooking) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("request-extension", {
        body: { bookingId: extBooking.id, extraHours: extHours },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast({
        title: t("booking.extensionRequested"),
        description: t("booking.extensionTotalPending", { total: data.total.toFixed(2) }),
      });
      setExtBooking(null);
      setExtHours(1);
    } catch (e: any) {
      toast({ title: t("booking.failed"), description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };


  const inWindow = (b: Booking) => {
    const now = Date.now();
    return now >= new Date(b.start_date).getTime() && b.escrow_status === "held";
  };
  const isOverdue = (b: Booking) =>
    b.escrow_status === "held" &&
    !b.completed_by_seeker_at &&
    Date.now() > new Date(b.end_date).getTime();

  return (
    <Card className="card-shadow">
      <CardHeader>
        <CardTitle className="text-lg">{t("booking.myBookings")}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : bookings.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("booking.noBookingsYet")}</p>
        ) : (
          <div className="space-y-3">
            {bookings.map((b) => (
              <div key={b.id} className="rounded-lg border p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex-1 min-w-[180px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium capitalize">{b.category === "parking" ? t("search.parking") : b.category === "storage" ? t("search.storage") : t("booking.booking")}</span>
                    <Badge
                      variant={
                        b.status === "cancelled"
                          ? "destructive"
                          : b.status === "completed"
                          ? "secondary"
                          : "default"
                      }
                      className="capitalize"
                    >
                      {t(`booking.status.${b.status}`, { defaultValue: b.status })}
                    </Badge>
                    {escrowBadge(b.escrow_status, t)}
                    {isOverdue(b) && <Badge variant="destructive">{t("booking.overdue")}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {b.city} • {new Date(b.start_date).toLocaleDateString(getIntlLocale())} →{" "}
                    {new Date(b.end_date).toLocaleDateString(getIntlLocale())}
                  </p>
                  {Number(b.overdue_charges_total || 0) > 0 && (
                    <p className="text-xs text-destructive mt-1">
                      {t("booking.overdueCharges", { amount: Number(b.overdue_charges_total).toFixed(2) })}
                    </p>
                  )}
                  {b.escrow_status === "held" && b.auto_release_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("booking.autoRelease", { datetime: new Date(b.auto_release_at).toLocaleString(getIntlLocale()) })}
                    </p>
                  )}
                  {b.status === "cancelled" && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("booking.refundLine", { amount: Number(b.refund_amount || 0).toFixed(2), status: b.refund_status || t("booking.na") })}
                    </p>
                  )}
                </div>
                <div className="text-right space-y-1">
                  <p className="font-semibold">${Number(b.total_amount).toFixed(2)}</p>
                  <div className="flex flex-wrap justify-end gap-1">
                    {inWindow(b) && !b.completed_by_seeker_at && (
                      <Button size="sm" onClick={() => completePickup(b)}>
                        {t("booking.completeAndPickup")}
                      </Button>
                    )}
                    {inWindow(b) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setExtBooking(b);
                          setExtHours(1);
                        }}
                      >
                        {t("booking.requestExtension")}
                      </Button>
                    )}
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
                    {CANCELLABLE.includes(b.status) &&
                      b.escrow_status !== "held" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setTarget(b)}
                        >
                          {t("common.cancel")}
                        </Button>
                      )}
                    {(() => {
                      const rs = reviewState(b);
                      if (rs === "eligible") {
                        return (
                          <Button size="sm" variant="default" onClick={() => setReviewBooking(b)}>
                            <Star className="w-3.5 h-3.5 mr-1" /> {t("booking.leaveAReview")}
                          </Button>
                        );
                      }
                      if (rs === "reviewed") {
                        return (
                          <Button size="sm" variant="outline" disabled>
                            {t("booking.reviewSubmitted")}
                          </Button>
                        );
                      }
                      if (rs === "expired") {
                        return (
                          <span className="text-xs text-muted-foreground self-center">
                            {t("booking.reviewPeriodExpired")}
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>

                </div>
                </div>
                {hasBookingIntake(b) && (
                  <div>
                    <button
                      type="button"
                      onClick={() => toggle(b.id)}
                      className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                    >
                      {expanded.has(b.id) ? (
                        <><ChevronUp className="w-3 h-3" /> {t("booking.hideDetails")}</>
                      ) : (
                        <><ChevronDown className="w-3 h-3" /> {b.category === "parking" ? t("booking.showVehicleDetails") : t("booking.showStorageDetails")}</>
                      )}
                    </button>
                    {expanded.has(b.id) && <BookingIntakeDetails booking={b} className="mt-2" />}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("booking.cancelThisBooking")}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p className="font-medium">{t("booking.cancellationPolicy")}</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>{t("booking.cancelPolicyFull")} <strong>{t("booking.fullRefund")}</strong></li>
                  <li>{t("booking.cancelPolicyPartial")} <strong>{t("booking.fiftyPercentRefund")}</strong></li>
                  <li>{t("booking.cancelPolicyNone")} <strong>{t("booking.noRefund")}</strong></li>
                </ul>
                {target && (
                  <p className="pt-2">
                    {t("booking.estimatedRefund")}{" "}
                    <strong>
                      ${refundPreview(target).amount.toFixed(2)} (
                      {refundPreview(target).pct}%)
                    </strong>
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>{t("booking.keepBooking")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmCancel();
              }}
              disabled={submitting}
            >
              {submitting ? t("booking.cancelling") : t("booking.confirmCancellation")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!extBooking} onOpenChange={(o) => !o && setExtBooking(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("booking.requestExtraTime")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="hrs">{t("booking.extraHours")}</Label>
            <Input
              id="hrs"
              type="number"
              min={1}
              max={168}
              value={extHours}
              onChange={(e) => setExtHours(Math.max(1, parseInt(e.target.value) || 1))}
            />
            <p className="text-xs text-muted-foreground">
              {t("booking.providerMustAccept")}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtBooking(null)} disabled={submitting}>
              {t("common.cancel")}
            </Button>
            <Button onClick={submitExtension} disabled={submitting}>
              {submitting ? t("booking.sending") : t("booking.sendRequest")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {reviewBooking && (
        <ReviewSubmissionModal
          open={!!reviewBooking}
          onOpenChange={(o) => !o && setReviewBooking(null)}
          bookingId={reviewBooking.id}
          listingId={reviewBooking.listing_id}
          revieweeId={reviewBooking.host_id}
          listingTitle={reviewBooking.listings?.title || undefined}
          onSubmitted={load}
        />
      )}
    </Card>
  );
};

export default SeekerBookingsList;
