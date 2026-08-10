import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";

export type DisputeStatus =
  | "open"
  | "under_review"
  | "resolved_seeker"
  | "resolved_host"
  | "closed";

const CLASS_MAP: Record<DisputeStatus, string> = {
  open: "bg-yellow-100 text-yellow-900 hover:bg-yellow-100 border-yellow-300",
  under_review: "bg-blue-100 text-blue-900 hover:bg-blue-100 border-blue-300",
  resolved_seeker: "bg-green-100 text-green-900 hover:bg-green-100 border-green-300",
  resolved_host: "bg-green-100 text-green-900 hover:bg-green-100 border-green-300",
  closed: "bg-muted text-muted-foreground hover:bg-muted",
};

const DisputeStatusBadge = ({
  status,
  onClick,
}: {
  status: DisputeStatus;
  onClick?: () => void;
}) => {
  const { t } = useTranslation();
  return (
    <Badge
      variant="outline"
      className={`cursor-pointer ${CLASS_MAP[status]}`}
      onClick={onClick}
    >
      {t(`disputes.status.${status}`)}
    </Badge>
  );
};

export default DisputeStatusBadge;
