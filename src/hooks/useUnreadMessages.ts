import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useUnreadMessages() {
  const { user } = useAuth();
  const [unread, setUnread] = useState<{ total: number; byConversation: Record<string, number> }>({
    total: 0,
    byConversation: {},
  });

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      // Fetch conversations the user participates in
      const { data: convs } = await supabase
        .from("conversations")
        .select("id")
        .or(`seeker_id.eq.${user.id},provider_id.eq.${user.id}`);
      const ids = (convs || []).map((c) => c.id);
      if (ids.length === 0) {
        setUnread({ total: 0, byConversation: {} });
        return;
      }
      const { data: msgs } = await supabase
        .from("messages")
        .select("conversation_id")
        .in("conversation_id", ids)
        .is("read_at", null)
        .neq("sender_id", user.id);

      const byConversation: Record<string, number> = {};
      for (const m of msgs || []) {
        byConversation[m.conversation_id] = (byConversation[m.conversation_id] || 0) + 1;
      }
      const total = Object.values(byConversation).reduce((a, b) => a + b, 0);
      setUnread({ total, byConversation });
    };

    load();

    const channel = supabase.channel(`unread-messages-${user.id}`);
    channel
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, load)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return unread;
}
