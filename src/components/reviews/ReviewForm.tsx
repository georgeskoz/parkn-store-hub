import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import StarRating from "./StarRating";
import { useToast } from "@/hooks/use-toast";

interface Props {
  bookingId: string;
  listingId: string;
  revieweeId: string;
  reviewerId: string;
  onSubmitted?: () => void;
}

export default function ReviewForm({ bookingId, listingId, revieweeId, reviewerId, onSubmitted }: Props) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const submit = async () => {
    if (rating < 1) {
      toast({ title: "Please pick a rating", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("reviews").insert({
      booking_id: bookingId,
      listing_id: listingId,
      reviewee_id: revieweeId,
      reviewer_id: reviewerId,
      rating,
      comment: comment.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Could not submit review", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Review submitted — thanks!" });
    onSubmitted?.();
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium mb-1">Your rating</p>
        <StarRating value={rating} onChange={setRating} size={28} />
      </div>
      <Textarea
        placeholder="Share your experience (optional)…"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
      />
      <Button onClick={submit} disabled={submitting}>
        {submitting ? "Submitting…" : "Submit Review"}
      </Button>
    </div>
  );
}
