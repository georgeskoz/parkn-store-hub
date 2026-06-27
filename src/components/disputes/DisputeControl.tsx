import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import DisputeStatusBadge, { DisputeStatus } from "./DisputeStatusBadge";
import DisputeSubmissionModal from "./DisputeSubmissionModal";
import DisputeDetailsModal from "./DisputeDetailsModal";
import { DisputeRow } from "@/hooks/useDisputes";

const DISPUTE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

type Props = {
  bookingId: string;
  bookingStatus: string;
  endDate: string;
  userId: string;
  dispute?: DisputeRow | null;
  onSubmitted?: () => void;
};

const DisputeControl = ({
  bookingId,
  bookingStatus,
  endDate,
  userId,
  dispute,
  onSubmitted,
}: Props) => {
  const [openSubmit, setOpenSubmit] = useState(false);
  const [openDetails, setOpenDetails] = useState(false);

  if (dispute) {
    return (
      <>
        <DisputeStatusBadge
          status={dispute.status as DisputeStatus}
          onClick={() => setOpenDetails(true)}
        />
        <DisputeDetailsModal
          open={openDetails}
          onOpenChange={setOpenDetails}
          dispute={dispute}
        />
      </>
    );
  }

  if (bookingStatus === "cancelled") return null;
  if (!["active", "completed"].includes(bookingStatus)) return null;

  const end = new Date(endDate).getTime();
  const expired = Date.now() - end > DISPUTE_WINDOW_MS;

  if (expired) {
    return (
      <span className="text-xs text-muted-foreground">Dispute window expired</span>
    );
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpenSubmit(true)}
        className="text-destructive border-destructive/40 hover:bg-destructive/10"
      >
        <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Raise a Dispute
      </Button>
      <DisputeSubmissionModal
        open={openSubmit}
        onOpenChange={setOpenSubmit}
        bookingId={bookingId}
        userId={userId}
        onSubmitted={onSubmitted}
      />
    </>
  );
};

export default DisputeControl;
