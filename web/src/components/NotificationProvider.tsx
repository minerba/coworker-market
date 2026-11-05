"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import Icon from "@/components/Icon";
import { subscribePush } from "@/lib/push";
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

export type NotifyPermission = NotificationPermission | "unsupported";

type Ctx = {
  unread: AppNotification[];
  refresh: () => Promise<void>;
  markReadByLink: (link: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  permission: NotifyPermission;
  requestPermission: () => Promise<NotifyPermission>;
  pushState: "idle" | "ok" | "failed";
};

const NotificationContext = createContext<Ctx>({
  unread: [],
  refresh: async () => {},
  markReadByLink: async () => {},
  markAllRead: async () => {},
  permission: "unsupported",
  requestPermission: async () => "unsupported",
  pushState: "idle",
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

const readPermission = (): NotifyPermission => (typeof Notification === "undefined" ? "unsupported" : Notification.permission);

// 앱이 백그라운드에 있을 때 시스템 알림으로 표시 (누르면 해당 화면으로 이동)
async function showSystemNotification(n: AppNotification) {
  try {
    const options = { body: n.body, tag: n.link, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", data: { link: n.link } };
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(n.title, options);
    else new Notification(n.title, options);
  } catch {
    /* 알림을 띄울 수 없는 환경은 무시 */
  }
}

export default function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const uid = session?.user.id;
  const [unread, setUnread] = useState<AppNotification[]>([]);
  const [toast, setToast] = useState<AppNotification | null>(null);
  const [permission, setPermission] = useState<NotifyPermission>(readPermission);
  const [pushState, setPushState] = useState<"idle" | "ok" | "failed">("idle");
  const pathRef = useRef(pathname);

  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

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
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` }, (payload) => {
        refresh();
        const n = payload.new as AppNotification | undefined;
        // 새 알림(읽지 않음)만 보여줌. 같은 방의 안 읽은 알림은 갱신(UPDATE)으로 도착함
        if (!n || n.read_at || payload.eventType === "DELETE") return;
        if (pathRef.current === n.link) return; // 지금 보고 있는 화면의 알림은 띄우지 않음
        if (document.hidden) showSystemNotification(n);
        else setToast(n);
      })
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [uid, refresh]);

  // 알림이 허용된 기기는 로그인할 때마다 푸시 등록을 확인 (앱을 닫아도 알림이 오도록)
  useEffect(() => {
    if (!uid || permission !== "granted") return;
    let cancelled = false;
    subscribePush().then((ok) => {
      if (!cancelled) setPushState(ok ? "ok" : "failed");
    });
    return () => {
      cancelled = true;
    };
  }, [uid, permission]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

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

  const requestPermission = useCallback(async (): Promise<NotifyPermission> => {
    if (typeof Notification === "undefined") return "unsupported";
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, []);

  const value = useMemo(
    () => ({ unread, refresh, markReadByLink, markAllRead, permission, requestPermission, pushState }),
    [unread, refresh, markReadByLink, markAllRead, permission, requestPermission, pushState],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {toast && (
        <button
          onClick={async () => {
            const link = toast.link;
            setToast(null);
            await markReadByLink(link);
            router.push(link);
          }}
          className="fixed top-3 left-1/2 z-[70] flex w-[calc(100%-1.5rem)] max-w-sm -translate-x-1/2 items-start gap-3 rounded-2xl border border-line bg-card p-3.5 text-left shadow-lg"
        >
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-dark">
            <Icon name={toast.type === "message" ? "chat" : "heart"} className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold">{toast.title}</span>
            <span className="mt-0.5 block truncate text-sm text-muted">{toast.body}</span>
          </span>
        </button>
      )}
    </NotificationContext.Provider>
  );
}
