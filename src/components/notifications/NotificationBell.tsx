import { Bell, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";

function useTimeAgo() {
  const { t } = useTranslation();
  return (iso: string): string => {
    const diff = Date.now() - new Date(iso).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60) return t("chrome.justNow");
    const m = Math.floor(s / 60);
    if (m < 60) return t("chrome.minutesAgo", { count: m });
    const h = Math.floor(m / 60);
    if (h < 24) return t("chrome.hoursAgo", { count: h });
    const d = Math.floor(h / 24);
    return t("chrome.daysAgo", { count: d });
  };
}

export default function NotificationBell() {
  const { visible, unreadCount, dismiss } = useAdminNotifications();
  const { t } = useTranslation();
  const timeAgo = useTimeAgo();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative" aria-label={t("chrome.notifications")}>
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-[10px] flex items-center justify-center"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">{t("chrome.announcements")}</h3>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {visible.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              {t("chrome.noAnnouncements")}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {visible.map((n) => (
                <li key={n.id} className="px-4 py-3 flex gap-2 items-start">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.sent_at)}</p>
                  </div>
                  <button
                    onClick={() => dismiss(n.id)}
                    className="text-muted-foreground hover:text-foreground shrink-0"
                    aria-label={t("chrome.dismiss")}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
