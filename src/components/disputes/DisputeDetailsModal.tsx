import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { DisputeRow } from "@/hooks/useDisputes";
import DisputeStatusBadge, { DisputeStatus } from "./DisputeStatusBadge";

const REASON_LABELS: Record<string, string> = {
  item_not_as_described: "Item not as described",
  no_show: "No show",
  property_damage: "Property damage",
  unauthorized_charge: "Unauthorized charge",
  safety_concern: "Safety concern",
  other: "Other",
};

const DisputeDetailsModal = ({
  open,
  onOpenChange,
  dispute,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  dispute: DisputeRow | null;
}) => {
  if (!dispute) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Dispute details</DialogTitle>
          <DialogDescription>
            Submitted {new Date(dispute.created_at).toLocaleString()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Status:</span>
            <DisputeStatusBadge status={dispute.status as DisputeStatus} />
          </div>
          <div>
            <p className="text-muted-foreground">Reason</p>
            <p className="font-medium">
              {REASON_LABELS[dispute.reason] || dispute.reason}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Description</p>
            <p className="whitespace-pre-wrap">{dispute.description}</p>
          </div>
          {dispute.evidence_urls?.length > 0 && (
            <div>
              <p className="text-muted-foreground mb-2">Evidence</p>
              <div className="flex flex-wrap gap-2">
                {dispute.evidence_urls.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="w-20 h-20 rounded-md overflow-hidden border"
                  >
                    <img
                      src={url}
                      alt={`Evidence ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}
          {dispute.admin_notes && (
            <div>
              <p className="text-muted-foreground">Admin notes</p>
              <p className="whitespace-pre-wrap">{dispute.admin_notes}</p>
            </div>
          )}
          {dispute.resolved_at && (
            <p className="text-xs text-muted-foreground">
              Resolved {new Date(dispute.resolved_at).toLocaleString()}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DisputeDetailsModal;
