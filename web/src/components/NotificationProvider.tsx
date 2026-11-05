"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";

export type AppNotification = {
  id: number;
  type: "message" | "like";
  title: string;
  body: string;
  link: string;
  read_at: string | null;
  created_at: string;
};

type Ctx = {
  unread: AppNotification[];
  refresh: () => Promise<void>;
  markReadByLink: (link: string) => Promise<void>;
  markAllRead: () => Promise<void>;
};

const NotificationContext = createContext<Ctx>({
  unread: [],
  refresh: async () => {},
  markReadByLink: async () => {},
  markAllRead: async () => {},
});
export const useNotifications = () => useContext(NotificationContext);

export const NOTIFICATION_COLUMNS = "id, type, title, body, link, read_at, created_at";

async function fetchUnread() {
  const { data } = await supabase
    .from("notifications")
    .select(NOTIFICATION_COLUMNS)
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(100);
  return (data as AppNotification[]) ?? [];
}

export default function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const uid = session?.user.id;
  const [unread, setUnread] = useState<AppNotification[]>([]);

  const refresh = useCallback(async () => {
    if (!uid) return;
    setUnread(await fetchUnread());
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    fetchUnread().then((list) => {
      if (!cancelled) setUnread(list);
    });
    const channel = supabase
      .channel(`notifications-${uid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` },
        () => refresh(),
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [uid, refresh]);

  const markReadByLink = useCallback(
    async (link: string) => {
      await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("link", link)
        .is("read_at", null);
      await refresh();
    },
    [refresh],
  );

  const markAllRead = useCallback(async () => {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
    await refresh();
  }, [refresh]);

  const value = useMemo(() => ({ unread, refresh, markReadByLink, markAllRead }), [unread, refresh, markReadByLink, markAllRead]);
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}
