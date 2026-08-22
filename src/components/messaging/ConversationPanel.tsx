import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Send, X } from "lucide-react";

interface Message {
  id: string;
  sender_id: string;
  // messages.content exists but is dead -- nothing else in either repo
  // reads or writes it (confirmed via grep). body is the real column:
  // NOT NULL, and already the one request-extension's system-message
  // insert uses successfully. Using content here was the actual cause of
  // every message send failing (23502: null value in column "body").
  body: string;
  created_at: string;
  read_at: string | null;
}

interface Conversation {
  id: string;
  booking_id: string;
  last_message_at: string;
}

interface Props {
  conversationId: string;
  onClose: () => void;
}

export default function ConversationPanel({ conversationId, onClose }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conv, setConv] = useState<Conversation | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load conversation. Callers always pass a real conversationId now --
  // conversations are only ever created via the booking_id-keyed flow
  // (SeekerBookingsList's Message Host button), which has its own RLS
  // policies and find-or-create logic. This component used to also
  // support finding/creating a conversation from listingId+providerId for
  // a pre-booking "message the host" flow, but that queried/inserted
  // listing_id/seeker_id/provider_id columns that never existed on
  // conversations (confirmed live: 42703 on all three) -- removed along
  // with the ListingDetail.tsx button that was its only caller, rather
  // than redesigning conversations to support a nullable booking_id.
  useEffect(() => {
    if (!user) return;

    const load = async () => {
      try {
        const { data: c, error } = await supabase
          .from("conversations")
          .select("*")
          .eq("id", conversationId)
          .single();
        if (!error && c) setConv(c);
      } catch {
        // gracefully ignore conversation load errors
      }
      setLoading(false);
    };
    load();
  }, [user, conversationId]);

  // Mark unread messages addressed to me as read
  const markRead = async () => {
    if (!conv?.id || !user) return;
    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", conv.id)
      .neq("sender_id", user.id)
      .is("read_at", null);
  };

  // Load messages + mark read
  useEffect(() => {
    if (!conv?.id) return;
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: true });
      setMessages(data || []);
      markRead();
    };
    fetchMessages();
  }, [conv?.id]);

  // Realtime subscription
  useEffect(() => {
    if (!conv?.id || !user) return;
    const channel = supabase
      .channel(`messages:${conv.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conv.id}` },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => [...prev, m]);
          if (m.sender_id !== user.id) markRead();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conv.id}` },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => prev.map((x) => (x.id === m.id ? m : x)));
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [conv?.id, user?.id]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !conv?.id || !user) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      conversation_id: conv.id,
      sender_id: user.id,
      body: input.trim(),
    });
    if (error) {
      console.error("Send message failed:", error);
      toast({ title: t("messaging.sendFailed"), description: error.message, variant: "destructive" });
    } else {
      setInput("");
    }
    setSending(false);
  };

  if (loading) {
    return (
      <div className="w-full md:w-96 h-[500px] border border-border rounded-lg bg-card flex flex-col">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h3 className="font-semibold text-sm">{t("nav.messages")}</h3>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full md:w-96 h-[500px] border border-border rounded-lg bg-card flex flex-col shadow-lg">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h3 className="font-semibold text-sm">Messages</h3>
        <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-8">
            {t("messaging.startConversation")}
          </p>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender_id === user?.id;
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
              <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${isMe ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                {msg.body}
              </div>
              {isMe && (
                <span className="text-[10px] text-muted-foreground mt-1">
                  {msg.read_at ? t("messaging.read") : t("messaging.sent")}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-3 border-t border-border flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder={t("messaging.typeAMessage")}
          className="flex-1"
        />
        <Button size="icon" onClick={handleSend} disabled={sending || !input.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
