import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Star, Loader2 } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  listingId: string;
  revieweeId: string;
  listingTitle?: string;
  onSubmitted?: () => void;
};

const MAX_LEN = 500;

const ReviewSubmissionModal = ({
  open,
  onOpenChange,
  bookingId,
  listingId,
  revieweeId,
  listingTitle,
  onSubmitted,
}: Props) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setRating(0);
    setHover(0);
    setComment("");
  };

  const submit = async () => {
    if (rating < 1) {
      toast({ title: "Please select a star rating", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) throw new Error("You must be signed in.");
      const { error } = await supabase.from("reviews").insert({
        booking_id: bookingId,
        listing_id: listingId,
        reviewer_id: auth.user.id,
        reviewee_id: revieweeId,
        rating,
        comment: comment.trim() || null,
        visible: true,
      });
      if (error) throw error;
      toast({ title: "Review submitted!" });
      onSubmitted?.();
      reset();
      onOpenChange(false);
    } catch (e: any) {
      const msg = e?.message || "Failed to submit review";
      toast({
        title: "Could not submit review",
        description: msg.includes("duplicate")
          ? "You've already reviewed this booking."
          : msg,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Leave a review</DialogTitle>
          <DialogDescription>
            {listingTitle
              ? `How was your experience with "${listingTitle}"?`
              : "Share your experience to help others."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-1" role="radiogroup" aria-label="Star rating">
            {[1, 2, 3, 4, 5].map((n) => {
              const filled = (hover || rating) >= n;
              return (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={rating === n}
                  aria-label={`${n} star${n > 1 ? "s" : ""}`}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(n)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 ${
                      filled ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                    }`}
                  />
                </button>
              );
            })}
          </div>

          <div className="space-y-1">
            <Textarea
              placeholder="Tell others what stood out (optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, MAX_LEN))}
              maxLength={MAX_LEN}
              rows={4}
            />
            <p className="text-xs text-muted-foreground text-right">
              {comment.length}/{MAX_LEN}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting || rating < 1}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Submit review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewSubmissionModal;
