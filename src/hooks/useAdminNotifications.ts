import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AdminNotification {
  id: string;
  type: "broadcast" | "individual";
  user_id: string | null;
  title: string;
  body: string;
  sent_at: string;
}

const DISMISS_KEY = "spotsvault_dismissed_notifications";

function readDismissed(): string[] {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeDismissed(ids: string[]) {
  try {
    localStorage.setItem(DISMISS_KEY, JSON.stringify(ids));
  } catch {}
}

export function useAdminNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [dismissed, setDismissed] = useState<string[]>(() => readDismissed());
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      let query = (supabase as any)
        .from("admin_notifications")
        .select("*")
        .gte("sent_at", thirtyDaysAgo)
        .order("sent_at", { ascending: false });

      if (user?.id) {
        query = query.or(`type.eq.broadcast,user_id.eq.${user.id}`);
      } else {
        query = query.eq("type", "broadcast");
      }

      const { data, error } = await query;
      if (error) {
        console.warn("admin_notifications fetch failed", error.message);
        setNotifications([]);
        return;
      }
      setNotifications((data || []) as AdminNotification[]);
    } catch (e) {
      console.warn("admin_notifications fetch error", e);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const dismiss = useCallback((id: string) => {
    setDismissed((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      writeDismissed(next);
      return next;
    });
  }, []);

  const visible = notifications.filter((n) => !dismissed.includes(n.id));

  return {
    notifications,
    visible,
    unreadCount: visible.length,
    dismiss,
    loading,
    refetch: fetchNotifications,
  };
}
