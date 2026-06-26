import { useState } from "react";
import { useReviewableBookings } from "@/hooks/useReviewableBookings";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import ReviewSubmissionModal from "./ReviewSubmissionModal";

type Props = {
  userId: string | undefined;
  role: "seeker" | "provider";
};

const ReviewPromptBanner = ({ userId, role }: Props) => {
  const { pending, reload } = useReviewableBookings(userId, role);
  const [openId, setOpenId] = useState<string | null>(null);

  if (!userId || pending.length === 0) return null;
  const next = pending[0];

  return (
    <>
      <Card className="mb-6 border-primary/30 bg-primary/5">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <Star className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">
                Your recent booking{next.listing_title ? ` at "${next.listing_title}"` : ""} is complete — how was your experience?
              </p>
              {pending.length > 1 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {pending.length - 1} more booking{pending.length - 1 === 1 ? "" : "s"} awaiting your review.
                </p>
              )}
            </div>
          </div>
          <Button size="sm" onClick={() => setOpenId(next.id)}>
            Write a Review
          </Button>
        </CardContent>
      </Card>

      <ReviewSubmissionModal
        open={openId === next.id}
        onOpenChange={(o) => setOpenId(o ? next.id : null)}
        bookingId={next.id}
        listingId={next.listing_id}
        revieweeId={next.counterparty_id}
        listingTitle={next.listing_title || undefined}
        onSubmitted={reload}
      />
    </>
  );
};

export default ReviewPromptBanner;
