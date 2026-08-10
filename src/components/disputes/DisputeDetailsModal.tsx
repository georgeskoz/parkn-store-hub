import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { DisputeRow } from "@/hooks/useDisputes";
import DisputeStatusBadge, { DisputeStatus } from "./DisputeStatusBadge";
import { getIntlLocale } from "@/lib/dateLocale";

const DisputeDetailsModal = ({
  open,
  onOpenChange,
  dispute,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  dispute: DisputeRow | null;
}) => {
  const { t } = useTranslation();
  if (!dispute) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("disputes.disputeDetails")}</DialogTitle>
          <DialogDescription>
            {t("disputes.submittedAt", { datetime: new Date(dispute.created_at).toLocaleString(getIntlLocale()) })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{t("disputes.statusLabel")}</span>
            <DisputeStatusBadge status={dispute.status as DisputeStatus} />
          </div>
          <div>
            <p className="text-muted-foreground">{t("disputes.reason")}</p>
            <p className="font-medium">
              {t(`disputes.reasonOption.${dispute.reason}`, { defaultValue: dispute.reason })}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("common.description")}</p>
            <p className="whitespace-pre-wrap">{dispute.description}</p>
          </div>
          {dispute.evidence_urls?.length > 0 && (
            <div>
              <p className="text-muted-foreground mb-2">{t("disputes.evidence")}</p>
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
                      alt={t("disputes.evidenceAlt", { number: i + 1 })}
                      className="w-full h-full object-cover"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}
          {dispute.admin_notes && (
            <div>
              <p className="text-muted-foreground">{t("disputes.adminNotes")}</p>
              <p className="whitespace-pre-wrap">{dispute.admin_notes}</p>
            </div>
          )}
          {dispute.resolved_at && (
            <p className="text-xs text-muted-foreground">
              {t("disputes.resolvedAt", { datetime: new Date(dispute.resolved_at).toLocaleString(getIntlLocale()) })}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DisputeDetailsModal;
