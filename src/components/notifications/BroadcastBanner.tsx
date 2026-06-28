import { X, Megaphone } from "lucide-react";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";

export default function BroadcastBanner() {
  const { visible, dismiss } = useAdminNotifications();

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const active = visible.find(
    (n) => n.type === "broadcast" && new Date(n.sent_at).getTime() >= sevenDaysAgo
  );

  if (!active) return null;

  return (
    <div className="bg-primary/10 border-b border-primary/20 text-foreground">
      <div className="container mx-auto px-4 py-2.5 flex items-start gap-3">
        <Megaphone className="w-4 h-4 text-primary mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{active.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{active.body}</p>
        </div>
        <button
          onClick={() => dismiss(active.id)}
          className="text-muted-foreground hover:text-foreground shrink-0"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
