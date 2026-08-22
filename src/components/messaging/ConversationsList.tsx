import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { getIntlLocale } from "@/lib/dateLocale";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Loader2 } from "lucide-react";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

interface ConversationRow {
  id: string;
  booking_id: string;
  // Real column is nullable -- a conversation with no messages yet has
  // last_message_at = null (confirmed live). new Date(null) formats as
  // epoch (1969-12-31/1970-01-01 depending on timezone), which is exactly
  // what was rendering here before messages could actually be sent.
  last_message_at: string | null;
  bookings?: {
    renter_id: string;
    host_id: string;
    listings: { title: string } | null;
  } | null;
}

interface Props {
  onSelectConversation: (id: string) => void;
  activeId?: string | null;
}

export default function ConversationsList({ onSelectConversation, activeId }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { byConversation } = useUnreadMessages();

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      // First find user's bookings
      const { data: bks } = await supabase
        .from("bookings")
        .select("id")
        .or(`renter_id.eq.${user.id},host_id.eq.${user.id}`);
      const bookingIds = (bks || []).map((b: any) => b.id);
      if (bookingIds.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("conversations")
        .select("id, booking_id, last_message_at, bookings(renter_id, host_id, listings(title))")
        .in("booking_id", bookingIds)
        .order("last_message_at", { ascending: false });
      if (error) {
        setConversations([]);
      } else {
        setConversations((data as any) || []);
      }
      setLoading(false);
    };
    fetch();

    const channel = supabase
      .channel("conversations-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, fetch)
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <Card className="card-shadow">
        <CardContent className="py-8 text-center">
          <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{t("messaging.noConversationsYet")}</p>
          <p className="text-xs text-muted-foreground">{t("messaging.messageProviderHint")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {conversations.map((c) => {
        const unread = byConversation[c.id] || 0;
        const active = activeId === c.id;
        return (
          <Card
            key={c.id}
            className={`card-shadow cursor-pointer transition-colors ${active ? "border-primary bg-muted/40" : "hover:bg-muted/50"}`}
            onClick={() => onSelectConversation(c.id)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base truncate">{c.bookings?.listings?.title || t("listingCard.listing")}</CardTitle>
                <div className="flex items-center gap-1 shrink-0">
                  {unread > 0 && (
                    <Badge className="text-xs">{unread}</Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {c.bookings?.renter_id === user?.id ? t("dashboard.provider") : t("dashboard.seeker")}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {c.last_message_at
                  ? t("messaging.lastMessage", { datetime: new Date(c.last_message_at).toLocaleString(getIntlLocale()) })
                  : t("messaging.noMessagesYet")}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
