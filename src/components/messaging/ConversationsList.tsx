import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Loader2 } from "lucide-react";

interface ConversationRow {
  id: string;
  listing_id: string;
  seeker_id: string;
  provider_id: string;
  last_message_at: string;
  listings: { title: string } | null;
}

interface Props {
  onSelectConversation: (id: string) => void;
}

export default function ConversationsList({ onSelectConversation }: Props) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("conversations")
        .select("id, listing_id, seeker_id, provider_id, last_message_at, listings(title)")
        .or(`seeker_id.eq.${user.id},provider_id.eq.${user.id}`)
        .order("last_message_at", { ascending: false });
      setConversations((data as any) || []);
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
          <p className="text-sm text-muted-foreground">No conversations yet.</p>
          <p className="text-xs text-muted-foreground">Message a provider from a listing page.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {conversations.map((c) => (
        <Card
          key={c.id}
          className="card-shadow cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => onSelectConversation(c.id)}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{c.listings?.title || "Listing"}</CardTitle>
              <Badge variant="outline" className="text-xs">
                {c.seeker_id === user?.id ? "Provider" : "Seeker"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Last message: {new Date(c.last_message_at).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
