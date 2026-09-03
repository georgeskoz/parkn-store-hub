import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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
import { Loader2, Star, ChevronDown, ChevronUp, Printer, Mail, Share2, Phone, Navigation, MessageSquare, Receipt } from "lucide-react";
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
  listings?: {
    title: string | null;
    address: string | null;
    province: string | null;
    postal_code: string | null;
    country: string | null;
  } | null;
};

type HostProfile = { display_name: string | null; phone: string | null };

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
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [hostProfiles, setHostProfiles] = useState<Record<string, HostProfile>>({});
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<Booking | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [extBooking, setExtBooking] = useState<Booking | null>(null);
  const [extHours, setExtHours] = useState(1);
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [printBooking, setPrintBooking] = useState<Booking | null>(null);
  const [messagingId, setMessagingId] = useState<string | null>(null);
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
        "id,listing_id,host_id,start_date,end_date,total_amount,status,category,city,refund_amount,refund_status,cancelled_at,escrow_status,auto_release_at,overdue_charges_total,completed_by_seeker_at,completed_by_provider_at,released_at,vehicle_plate,vehicle_type,vehicle_make,vehicle_colour,drivers_license,license_province_state,storage_items,storage_notes,storage_size,dropoff_date,dropoff_time,listings(title,address,province,postal_code,country)",
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
    // profiles_public (not the raw profiles table) is the intended
    // renter-facing surface for host contact info -- confirmed live under
    // real anon-key RLS that it exposes phone deliberately, same view
    // ListingDetail.tsx already uses to show host contact info pre-booking.
    const hostIds = [...new Set(list.map((b) => b.host_id).filter(Boolean))];
    if (hostIds.length) {
      const { data: hosts, error: hostsError } = await supabase
        .from("profiles_public")
        .select("id, display_name, phone")
        .in("id", hostIds);
      if (hostsError) {
        console.error("SeekerBookingsList host profile load failed:", hostsError);
      }
      const map: Record<string, HostProfile> = {};
      for (const h of (hosts || []) as any[]) {
        map[h.id] = { display_name: h.display_name, phone: h.phone };
      }
      setHostProfiles(map);
    } else {
      setHostProfiles({});
    }
    setLoading(false);
  };

  useEffect(() => {
    if (userId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // window.print() prints synchronously in most browsers but the printable
  // content needs to be in the DOM first -- set state, let it render, then
  // print on the next tick. afterprint resets it so the hidden print-only
  // block doesn't linger with stale content.
  useEffect(() => {
    if (!printBooking) return;
    const timer = setTimeout(() => window.print(), 50);
    return () => clearTimeout(timer);
  }, [printBooking]);

  useEffect(() => {
    const clearPrint = () => setPrintBooking(null);
    window.addEventListener("afterprint", clearPrint);
    return () => window.removeEventListener("afterprint", clearPrint);
  }, []);

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

  // Full mailing/nav address -- listings.address is the real column
  // (confirmed live, e.g. "27 Rue De L'abbe-Mangin"), joined with the
  // booking's own city snapshot (bookings.city is copied from the listing
  // at booking time, already used elsewhere on this card) plus the
  // listing's province/postal_code/country, which bookings doesn't
  // snapshot. Falls back to just the city if the listing join is missing
  // (shouldn't happen, but the card already tolerates a missing listings
  // join for the title the same way).
  const buildFullAddress = (b: Booking): string | null => {
    const l = b.listings;
    if (!l?.address) return null;
    return [l.address, b.city, l.province, l.postal_code, l.country].filter(Boolean).join(", ");
  };

  // Shared by print/email/share so the three surfaces never drift out of
  // sync with each other -- same fields visible on the card.
  const buildBookingSummary = (b: Booking): string[] => {
    const listingTitle = b.listings?.title || t("booking.booking");
    const categoryLabel =
      b.category === "parking"
        ? t("search.parking")
        : b.category === "storage"
        ? t("search.storage")
        : t("booking.booking");
    const fmt = (iso: string) =>
      new Date(iso).toLocaleString(getIntlLocale(), { dateStyle: "medium", timeStyle: "short" });
    const host = hostProfiles[b.host_id];
    const lines = [
      `${t("booking.summaryListing")}: ${listingTitle} (${categoryLabel})`,
      `${t("booking.summaryLocation")}: ${buildFullAddress(b) || b.city || t("booking.na")}`,
      `${t("booking.summaryDates")}: ${fmt(b.start_date)} → ${fmt(b.end_date)}`,
      `${t("booking.summaryPrice")}: $${Number(b.total_amount).toFixed(2)}`,
      `${t("booking.summaryStatus")}: ${t(`booking.status.${b.status}`, { defaultValue: b.status })}`,
    ];
    if (host?.display_name) {
      lines.push(`${t("booking.summaryHost")}: ${host.display_name}`);
    }
    if (b.category === "parking" && (b.vehicle_plate || b.vehicle_make || b.vehicle_type)) {
      const vehicle = [b.vehicle_colour, b.vehicle_make, b.vehicle_type].filter(Boolean).join(" ");
      lines.push(
        `${t("booking.summaryVehicle")}: ${vehicle}${b.vehicle_plate ? ` (${b.vehicle_plate})` : ""}`,
      );
      if (b.drivers_license) {
        lines.push(
          `${t("booking.summaryDriversLicense")}: ${b.drivers_license}${
            b.license_province_state ? ` (${b.license_province_state})` : ""
          }`,
        );
      }
    }
    if (b.category === "storage") {
      if (b.storage_size) lines.push(`${t("booking.summaryStorageSize")}: ${b.storage_size}`);
      if (b.dropoff_date) {
        lines.push(
          `${t("booking.summaryDropoff")}: ${fmt(b.dropoff_date)}${b.dropoff_time ? ` ${b.dropoff_time}` : ""}`,
        );
      }
      if (b.storage_notes) lines.push(`${t("booking.summaryStorageNotes")}: ${b.storage_notes}`);
    }
    return lines;
  };

  const handlePrint = (b: Booking) => setPrintBooking(b);

  const handleEmail = (b: Booking) => {
    const listingTitle = b.listings?.title || t("booking.booking");
    const subject = t("booking.emailSubject", { title: listingTitle });
    const body = buildBookingSummary(b).join("\n");
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleShare = async (b: Booking) => {
    const listingTitle = b.listings?.title || t("booking.booking");
    const title = t("booking.emailSubject", { title: listingTitle });
    const text = buildBookingSummary(b).join("\n");
    // No per-booking detail page exists in this app to link to (only
    // /booking/intake, /booking/confirm, /booking/success -- none take a
    // booking id) -- omitting the optional url field rather than pointing
    // at something that doesn't resolve to this booking.
    if (navigator.share) {
      try {
        await navigator.share({ title, text });
      } catch (err: any) {
        // AbortError -- user dismissed the native share sheet, not a failure.
        if (err?.name !== "AbortError") {
          console.error("Share failed:", err);
        }
      }
      return;
    }
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        toast({ title: t("booking.copiedToClipboard") });
      } catch (err) {
        console.error("Clipboard write failed:", err);
      }
    }
  };

  // conversations is genuinely keyed by booking_id (confirmed live) --
  // unlike ListingDetail.tsx's pre-booking "message host" flow, which
  // still tries listing_id/seeker_id/provider_id (none of which exist on
  // the real table, confirmed live via 42703 errors) and silently fails.
  // That's a separate, pre-existing bug, tracked separately -- this
  // find-or-create is deliberately not copy-pasted from it.
  const handleMessageHost = async (b: Booking) => {
    setMessagingId(b.id);
    try {
      const { data: existing, error: findErr } = await supabase
        .from("conversations")
        .select("id")
        .eq("booking_id", b.id)
        .maybeSingle();
      if (findErr) throw findErr;

      let conversationId = existing?.id as string | undefined;
      if (!conversationId) {
        const { data: created, error: createErr } = await supabase
          .from("conversations")
          .insert({ booking_id: b.id })
          .select("id")
          .single();
        if (createErr) throw createErr;
        conversationId = created.id;
      }
      navigate("/messages", { state: { conversationId } });
    } catch (e: any) {
      console.error("Message host failed:", e);
      toast({ title: t("booking.failed"), description: e.message, variant: "destructive" });
    } finally {
      setMessagingId(null);
    }
  };

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
                    {buildFullAddress(b) || b.city}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(b.start_date).toLocaleString(getIntlLocale(), { dateStyle: "medium", timeStyle: "short" })}
                    {" → "}
                    {new Date(b.end_date).toLocaleString(getIntlLocale(), { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                  {hostProfiles[b.host_id]?.display_name && (
                    <p className="text-xs text-muted-foreground">
                      {t("booking.hostedBy", { name: hostProfiles[b.host_id].display_name })}
                    </p>
                  )}
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
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      title={t("booking.messageHost")}
                      aria-label={t("booking.messageHost")}
                      onClick={() => handleMessageHost(b)}
                      disabled={messagingId === b.id}
                    >
                      {messagingId === b.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <MessageSquare className="w-4 h-4" />
                      )}
                    </Button>
                    {hostProfiles[b.host_id]?.phone && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        title={t("booking.call")}
                        aria-label={t("booking.call")}
                        asChild
                      >
                        <a href={`tel:${hostProfiles[b.host_id].phone}`}>
                          <Phone className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                    {buildFullAddress(b) && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        title={t("booking.navigate")}
                        aria-label={t("booking.navigate")}
                        asChild
                      >
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(buildFullAddress(b)!)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Navigation className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      title={t("receipt.viewReceipt")}
                      aria-label={t("receipt.viewReceipt")}
                      asChild
                    >
                      <Link to={`/booking/receipt/${b.id}`}>
                        <Receipt className="w-4 h-4" />
                      </Link>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      title={t("booking.print")}
                      aria-label={t("booking.print")}
                      onClick={() => handlePrint(b)}
                    >
                      <Printer className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      title={t("booking.email")}
                      aria-label={t("booking.email")}
                      onClick={() => handleEmail(b)}
                    >
                      <Mail className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      title={t("booking.share")}
                      aria-label={t("booking.share")}
                      onClick={() => handleShare(b)}
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
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

      {/* Screen: never rendered (hidden). Print: the #booking-print-area
          rule in index.css hides everything else on the page (nav,
          sidebar, other cards) and shows only this block, positioned at
          the page origin -- see that file for the full trick. */}
      <div id="booking-print-area" className="hidden print:block p-8 text-black">
        {printBooking && (
          <>
            <h1 className="text-xl font-bold mb-1">SpotsVault</h1>
            <h2 className="text-lg mb-4">{printBooking.listings?.title || t("booking.booking")}</h2>
            <div className="space-y-1 text-sm">
              {buildBookingSummary(printBooking).map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </>
        )}
      </div>
    </Card>
  );
};

export default SeekerBookingsList;
