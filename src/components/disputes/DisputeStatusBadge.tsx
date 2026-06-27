import { Badge } from "@/components/ui/badge";

export type DisputeStatus =
  | "open"
  | "under_review"
  | "resolved_seeker"
  | "resolved_host"
  | "closed";

const MAP: Record<DisputeStatus, { label: string; className: string }> = {
  open: {
    label: "Dispute Pending 🕐",
    className: "bg-yellow-100 text-yellow-900 hover:bg-yellow-100 border-yellow-300",
  },
  under_review: {
    label: "Under Review 🔍",
    className: "bg-blue-100 text-blue-900 hover:bg-blue-100 border-blue-300",
  },
  resolved_seeker: {
    label: "Resolved — Refund issued ✓",
    className: "bg-green-100 text-green-900 hover:bg-green-100 border-green-300",
  },
  resolved_host: {
    label: "Resolved — Payment released ✓",
    className: "bg-green-100 text-green-900 hover:bg-green-100 border-green-300",
  },
  closed: {
    label: "Closed",
    className: "bg-muted text-muted-foreground hover:bg-muted",
  },
};

const DisputeStatusBadge = ({
  status,
  onClick,
}: {
  status: DisputeStatus;
  onClick?: () => void;
}) => {
  const cfg = MAP[status];
  return (
    <Badge
      variant="outline"
      className={`cursor-pointer ${cfg.className}`}
      onClick={onClick}
    >
      {cfg.label}
    </Badge>
  );
};

export default DisputeStatusBadge;
