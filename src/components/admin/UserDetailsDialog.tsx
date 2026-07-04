import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileCheck2 } from "lucide-react";

type Agreement = {
  created_at: string;
  terms_version: string | null;
  privacy_version: string | null;
  user_agent: string | null;
};

interface Props {
  userId: string | null;
  userName: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const fmt = (v: string | null) => (v ? new Date(v).toLocaleString() : "—");

const UserDetailsDialog = ({ userId, userName, open, onOpenChange }: Props) => {
  const [loading, setLoading] = useState(false);
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!open || !userId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoaded(false);
      const { data } = await supabase
        .from("user_agreements")
        .select("created_at, terms_version, privacy_version, user_agent")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      setAgreement((data as Agreement) ?? null);
      setLoading(false);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, userId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{userName || "User details"}</DialogTitle>
          <DialogDescription>Read-only account information.</DialogDescription>
        </DialogHeader>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-primary" />
              Legal Agreements
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {loading || !loaded ? (
              <div className="text-muted-foreground">Loading…</div>
            ) : !agreement ? (
              <div className="text-muted-foreground">No record on file.</div>
            ) : (
              <dl className="grid grid-cols-[140px_1fr] gap-y-2 gap-x-4">
                <dt className="text-muted-foreground">Accepted at</dt>
                <dd className="text-foreground">{fmt(agreement.created_at)}</dd>
                <dt className="text-muted-foreground">Terms version</dt>
                <dd className="text-foreground">{fmt(agreement.terms_version)}</dd>
                <dt className="text-muted-foreground">Privacy version</dt>
                <dd className="text-foreground">{fmt(agreement.privacy_version)}</dd>
              </dl>
            )}
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};

export default UserDetailsDialog;
