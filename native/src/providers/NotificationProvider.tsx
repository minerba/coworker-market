import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthProvider";
import { getPushPermission, registerForPush, type PushPermission } from "@/lib/push";
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
export const NOTIFICATION_COLUMNS = "id, type, title, body, link, read_at, created_at";

type Ctx = {
  unread: AppNotification[];
  refresh: () => Promise<void>;
  markReadByLink: (link: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  permission: PushPermission;
  pushRegistered: boolean;
  requestPermission: () => Promise<PushPermission>;
};

const NotificationContext = createContext<Ctx>({
  unread: [],
  refresh: async () => {},
  markReadByLink: async () => {},
  markAllRead: async () => {},
  permission: "default",
  pushRegistered: false,
  requestPermission: async () => "default",
});
export const useNotifications = () => useContext(NotificationContext);

async function fetchUnread() {
  const { data } = await supabase.from("notifications").select(NOTIFICATION_COLUMNS).is("read_at", null).order("created_at", { ascending: false }).limit(100);
  return (data as AppNotification[]) ?? [];
}

export default function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const uid = session?.user.id;
  const [unread, setUnread] = useState<AppNotification[]>([]);
  const [permission, setPermission] = useState<PushPermission>("default");
  const [pushRegistered, setPushRegistered] = useState(false);

  const refresh = useCallback(async () => {
    if (!uid) return;
    setUnread(await fetchUnread());
  }, [uid]);

  // 안 읽은 알림 개수: 처음 한 번 불러오고, 새 알림은 실시간으로 반영
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    fetchUnread().then((list) => !cancelled && setUnread(list));
    const channel = supabase
      .channel(`notifications-${uid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` }, () => refresh())
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [uid, refresh]);

  // 로그인할 때마다 권한 상태를 확인하고, 이미 허용된 기기는 푸시 등록을 갱신
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    getPushPermission().then(async (p) => {
      if (cancelled) return;
      setPermission(p);
      if (p === "granted") {
        const r = await registerForPush(false);
        if (!cancelled) setPushRegistered(r.registered);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const markReadByLink = useCallback(
    async (link: string) => {
      await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("link", link).is("read_at", null);
      await refresh();
    },
    [refresh],
  );
  const markAllRead = useCallback(async () => {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
    await refresh();
  }, [refresh]);
  const requestPermission = useCallback(async () => {
    const r = await registerForPush(true);
    setPermission(r.permission);
    setPushRegistered(r.registered);
    return r.permission;
  }, []);

  const value = useMemo(
    () => ({ unread, refresh, markReadByLink, markAllRead, permission, pushRegistered, requestPermission }),
    [unread, refresh, markReadByLink, markAllRead, permission, pushRegistered, requestPermission],
  );
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}
