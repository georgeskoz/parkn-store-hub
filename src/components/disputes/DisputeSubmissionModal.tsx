import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, X } from "lucide-react";

const REASONS = [
  "item_not_as_described",
  "no_show",
  "property_damage",
  "unauthorized_charge",
  "safety_concern",
  "other",
];

const MAX_PHOTOS = 3;
const MIN_DESC = 20;
const MAX_DESC = 1000;

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  bookingId: string;
  userId: string;
  onSubmitted?: () => void;
};

const DisputeSubmissionModal = ({
  open,
  onOpenChange,
  bookingId,
  userId,
  onSubmitted,
}: Props) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setReason("");
    setDescription("");
    setFiles([]);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files || []);
    const merged = [...files, ...incoming].slice(0, MAX_PHOTOS);
    setFiles(merged);
    e.target.value = "";
  };

  const removeFile = (i: number) => {
    setFiles(files.filter((_, idx) => idx !== i));
  };

  const uploadEvidence = async (): Promise<string[]> => {
    if (!files.length) return [];
    const urls: string[] = [];
    for (const f of files) {
      const ext = f.name.split(".").pop() || "jpg";
      const path = `disputes/${bookingId}/${userId}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("listing-photos")
        .upload(path, f, { upsert: false, contentType: f.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("listing-photos").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  };

  const submit = async () => {
    if (!reason) {
      toast({ title: t("disputes.pickAReason"), variant: "destructive" });
      return;
    }
    if (description.trim().length < MIN_DESC) {
      toast({
        title: t("disputes.descriptionMinLength", { count: MIN_DESC }),
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const evidence_urls = await uploadEvidence();
      const { data, error } = await supabase.functions.invoke("open-dispute", {
        body: {
          booking_id: bookingId,
          raised_by: userId,
          reason,
          description: description.trim(),
          evidence_urls,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({
        title: t("disputes.disputeSubmitted"),
        description: t("disputes.teamWillReview"),
      });
      reset();
      onOpenChange(false);
      onSubmitted?.();
    } catch (e: any) {
      toast({
        title: t("disputes.failedToSubmit"),
        description: e.message || String(e),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("disputes.raiseADispute")}</DialogTitle>
          <DialogDescription>
            {t("disputes.tellUsWhatHappened")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("disputes.reason")}</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder={t("disputes.selectAReason")} />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {t(`disputes.reasonOption.${r}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("common.description")}</Label>
            <Textarea
              rows={5}
              value={description}
              maxLength={MAX_DESC}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("disputes.describeWhatHappened")}
            />
            <p className="text-xs text-muted-foreground text-right">
              {t("disputes.descriptionCounter", { count: description.length, max: MAX_DESC, min: MIN_DESC })}
            </p>
          </div>

          <div className="space-y-2">
            <Label>{t("disputes.evidenceOptional", { count: MAX_PHOTOS })}</Label>
            {files.length < MAX_PHOTOS && (
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={onFileChange}
              />
            )}
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {files.map((f, i) => (
                  <div
                    key={i}
                    className="relative w-20 h-20 rounded-md overflow-hidden border bg-muted"
                  >
                    <img
                      src={URL.createObjectURL(f)}
                      alt={f.name}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute top-0 right-0 bg-background/80 rounded-bl p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            disabled={submitting}
            onClick={() => onOpenChange(false)}
          >
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> {t("listingWizard.submitting")}
              </>
            ) : (
              t("disputes.submitDispute")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DisputeSubmissionModal;
