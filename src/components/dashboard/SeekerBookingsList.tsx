import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
};

const CANCELLABLE = ["pending", "confirmed", "active"];

const SeekerBookingsList = ({ userId }: { userId: string }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<Booking | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("bookings")
      .select(
        "id,listing_id,start_date,end_date,total_amount,status,category,city,refund_amount,refund_status,cancelled_at",
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
      toast({
        title: "Cancellation failed",
        description: e.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

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
                  <div className="flex items-center gap-2">
                    <span className="font-medium capitalize">
                      {b.category || "booking"}
                    </span>
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
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {b.city} • {new Date(b.start_date).toLocaleDateString()} →{" "}
                    {new Date(b.end_date).toLocaleDateString()}
                  </p>
                  {b.status === "cancelled" && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Refund: ${Number(b.refund_amount || 0).toFixed(2)} (
                      {b.refund_status || "n/a"})
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    ${Number(b.total_amount).toFixed(2)}
                  </p>
                  {CANCELLABLE.includes(b.status) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-1"
                      onClick={() => setTarget(b)}
                    >
                      Cancel Booking
                    </Button>
                  )}
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
            <AlertDialogCancel disabled={submitting}>
              Keep booking
            </AlertDialogCancel>
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
    </Card>
  );
};

export default SeekerBookingsList;
