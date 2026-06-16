import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import StarRating from "@/components/reviews/StarRating";
import { Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  visible: boolean;
  reviewer_id: string;
  reviewer_name?: string;
}

interface Props {
  listingId: string | null;
  listingTitle?: string;
  open: boolean;
  onClose: () => void;
}

export default function AdminReviewManager({ listingId, listingTitle, open, onClose }: Props) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    if (!listingId) return;
    setLoading(true);
    const { data } = await supabase
      .from("reviews")
      .select("id, rating, comment, created_at, visible, reviewer_id")
      .eq("listing_id", listingId)
      .order("created_at", { ascending: false });
    const rows = (data || []) as Review[];
    const ids = Array.from(new Set(rows.map((r) => r.reviewer_id)));
    if (ids.length) {
      const { data: profs } = await (supabase as any)
        .from("profiles_public").select("id, full_name").in("id", ids);
      const m = new Map<string, string>((profs || []).map((p: any) => [p.id, p.full_name]));
      rows.forEach((r) => { r.reviewer_name = m.get(r.reviewer_id) || "Anonymous"; });
    }
    setReviews(rows);
    setLoading(false);
  };

  useEffect(() => { if (open) load(); }, [open, listingId]);

  const toggleVisible = async (r: Review) => {
    const { error } = await supabase.from("reviews").update({ visible: !r.visible }).eq("id", r.id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    setReviews((rs) => rs.map((x) => (x.id === r.id ? { ...x, visible: !x.visible } : x)));
  };

  const remove = async (r: Review) => {
    const { error } = await supabase.from("reviews").delete().eq("id", r.id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    setReviews((rs) => rs.filter((x) => x.id !== r.id));
    toast({ title: "Review deleted" });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reviews — {listingTitle}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No reviews for this listing.</p>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="border border-border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground text-sm">{r.reviewer_name}</p>
                    <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Visible</span>
                    <Switch checked={r.visible} onCheckedChange={() => toggleVisible(r)} />
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(r)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <StarRating value={r.rating} readOnly size={14} />
                {r.comment && <p className="text-sm text-foreground/90">{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
