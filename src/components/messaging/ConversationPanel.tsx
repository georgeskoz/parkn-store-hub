import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, X } from "lucide-react";

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface Conversation {
  id: string;
  listing_id: string;
  seeker_id: string;
  provider_id: string;
  last_message_at: string;
}

interface Props {
  conversationId?: string;
  listingId?: string;
  providerId?: string;
  onClose: () => void;
}

export default function ConversationPanel({ conversationId, listingId, providerId, onClose }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conv, setConv] = useState<Conversation | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load or create conversation
  useEffect(() => {
    if (!user) return;

    const load = async () => {
      if (conversationId) {
        const { data: c } = await supabase
          .from("conversations")
          .select("*")
          .eq("id", conversationId)
          .single();
        if (c) setConv(c);
      } else if (listingId && providerId) {
        const { data: existing } = await supabase
          .from("conversations")
          .select("*")
          .eq("listing_id", listingId)
          .eq("seeker_id", user.id)
          .eq("provider_id", providerId)
          .maybeSingle();

        if (existing) {
          setConv(existing);
        } else {
          const { data: created } = await supabase
            .from("conversations")
            .insert({ listing_id: listingId, seeker_id: user.id, provider_id })
            .select("*")
            .single();
          if (created) setConv(created);
        }
      }
      setLoading(false);
    };
    load();
  }, [user, conversationId, listingId, providerId]);

  // Load messages
  useEffect(() => {
    if (!conv?.id) return;
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: true });
      setMessages(data || []);
    };
    fetchMessages();
  }, [conv?.id]);

  // Realtime subscription
  useEffect(() => {
    if (!conv?.id) return;
    const channel = supabase
      .channel(`messages:${conv.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conv.id}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [conv?.id]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !conv?.id || !user) return;
    setSending(true);
    await supabase.from("messages").insert({
      conversation_id: conv.id,
      sender_id: user.id,
      content: input.trim(),
    });
    setInput("");
    setSending(false);
  };

  if (loading) {
    return (
      <div className="w-full md:w-96 h-[500px] border border-border rounded-lg bg-card flex flex-col">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h3 className="font-semibold text-sm">Messages</h3>
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
            Start a conversation with the provider.
          </p>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender_id === user?.id;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${isMe ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                {msg.content}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3 border-t border-border flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Type a message..."
          className="flex-1"
        />
        <Button size="icon" onClick={handleSend} disabled={sending || !input.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
