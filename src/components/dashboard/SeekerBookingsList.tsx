import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { Loader2 } from "lucide-react";

type Booking = {
  id: string;
  listing_id: string;
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
  overdue_charges_total: number | null;
  completed_by_seeker_at: string | null;
  completed_by_provider_at: string | null;
};

const CANCELLABLE = ["pending", "confirmed", "active"];

const escrowBadge = (s: string | null) => {
  switch (s) {
    case "held":
      return <Badge variant="secondary">In escrow</Badge>;
    case "released":
      return <Badge>Released</Badge>;
    case "disputed":
      return <Badge variant="destructive">Disputed</Badge>;
    case "refunded":
      return <Badge variant="outline">Refunded</Badge>;
    default:
      return null;
  }
};

const SeekerBookingsList = ({ userId }: { userId: string }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<Booking | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [extBooking, setExtBooking] = useState<Booking | null>(null);
  const [extHours, setExtHours] = useState(1);
  const [disputeBooking, setDisputeBooking] = useState<Booking | null>(null);
  const [disputeReason, setDisputeReason] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("bookings")
      .select(
        "id,listing_id,start_date,end_date,total_amount,status,category,city,refund_amount,refund_status,cancelled_at,escrow_status,auto_release_at,overdue_charges_total,completed_by_seeker_at,completed_by_provider_at",
      )
      .eq("seeker_id", userId)
      .order("start_date", { ascending: false });
    setBookings((data || []) as Booking[]);
    setLoading(false);
  };

  useEffect(() => {
    if (userId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

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
        title: "Booking cancelled",
        description: data?.refundAmount
          ? `Refund of $${data.refundAmount.toFixed(2)} (${data.refundPercent}%) is being processed.`
          : "No refund applies under the cancellation policy.",
      });
      setTarget(null);
      await load();
    } catch (e: any) {
      toast({ title: "Cancellation failed", description: e.message, variant: "destructive" });
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
      toast({ title: "Pickup confirmed", description: "Funds will release shortly." });
      await load();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
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
        title: "Extension requested",
        description: `Total $${data.total.toFixed(2)} CAD pending provider approval.`,
      });
      setExtBooking(null);
      setExtHours(1);
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const submitDispute = async () => {
    if (!disputeBooking || !disputeReason.trim()) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("open-dispute", {
        body: { bookingId: disputeBooking.id, reason: disputeReason },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast({ title: "Dispute opened", description: "Our team will review shortly." });
      setDisputeBooking(null);
      setDisputeReason("");
      await load();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
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
        <CardTitle className="text-lg">My Bookings</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : bookings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No bookings yet.</p>
        ) : (
          <div className="space-y-3">
            {bookings.map((b) => (
              <div
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border"
              >
                <div className="flex-1 min-w-[180px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium capitalize">{b.category || "booking"}</span>
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
                      {b.status}
                    </Badge>
                    {escrowBadge(b.escrow_status)}
                    {isOverdue(b) && <Badge variant="destructive">Overdue</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {b.city} • {new Date(b.start_date).toLocaleDateString()} →{" "}
                    {new Date(b.end_date).toLocaleDateString()}
                  </p>
                  {Number(b.overdue_charges_total || 0) > 0 && (
                    <p className="text-xs text-destructive mt-1">
                      Overdue charges: ${Number(b.overdue_charges_total).toFixed(2)} (2× daily rate)
                    </p>
                  )}
                  {b.escrow_status === "held" && b.auto_release_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Auto-release: {new Date(b.auto_release_at).toLocaleString()}
                    </p>
                  )}
                  {b.status === "cancelled" && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Refund: ${Number(b.refund_amount || 0).toFixed(2)} ({b.refund_status || "n/a"})
                    </p>
                  )}
                </div>
                <div className="text-right space-y-1">
                  <p className="font-semibold">${Number(b.total_amount).toFixed(2)}</p>
                  <div className="flex flex-wrap justify-end gap-1">
                    {inWindow(b) && !b.completed_by_seeker_at && (
                      <Button size="sm" onClick={() => completePickup(b)}>
                        Complete & Pickup
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
                        Request extension
                      </Button>
                    )}
                    {b.escrow_status === "held" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDisputeBooking(b)}
                      >
                        Dispute
                      </Button>
                    )}
                    {CANCELLABLE.includes(b.status) &&
                      b.escrow_status !== "held" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setTarget(b)}
                        >
                          Cancel
                        </Button>
                      )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p className="font-medium">Cancellation policy</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Cancel 24h+ before start: <strong>full refund</strong></li>
                  <li>Cancel within 24h of start: <strong>50% refund</strong></li>
                  <li>No-show / after start: <strong>no refund</strong></li>
                </ul>
                {target && (
                  <p className="pt-2">
                    Estimated refund:{" "}
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
            <AlertDialogCancel disabled={submitting}>Keep booking</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmCancel();
              }}
              disabled={submitting}
            >
              {submitting ? "Cancelling…" : "Confirm cancellation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!extBooking} onOpenChange={(o) => !o && setExtBooking(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request extra time</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="hrs">Extra hours</Label>
            <Input
              id="hrs"
              type="number"
              min={1}
              max={168}
              value={extHours}
              onChange={(e) => setExtHours(Math.max(1, parseInt(e.target.value) || 1))}
            />
            <p className="text-xs text-muted-foreground">
              Provider must accept. You'll be charged automatically on the card you used.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtBooking(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={submitExtension} disabled={submitting}>
              {submitting ? "Sending…" : "Send request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!disputeBooking} onOpenChange={(o) => !o && setDisputeBooking(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open a dispute</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="dr">Reason</Label>
            <Input
              id="dr"
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="Briefly describe the issue"
            />
            <p className="text-xs text-muted-foreground">
              Funds will be held until SpotVault reviews.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisputeBooking(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={submitDispute}
              disabled={submitting || !disputeReason.trim()}
            >
              {submitting ? "Opening…" : "Open dispute"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default SeekerBookingsList;
