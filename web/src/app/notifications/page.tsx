"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import Icon from "@/components/Icon";
import { NOTIFICATION_COLUMNS, useNotifications, type AppNotification } from "@/components/NotificationProvider";
import { supabase } from "@/lib/supabase";
import { timeAgo } from "@/lib/items";

export default function NotificationsPage() {
  const router = useRouter();
  const { unread, markReadByLink, markAllRead } = useNotifications();
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    supabase
      .from("notifications")
      .select(NOTIFICATION_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        setFailed(!!error);
        setItems((data as AppNotification[]) ?? []);
      });
  }, [unread.length]);

  return (
    <>
      <PageHeader
        title="알림"
        right={
          unread.length > 0 ? (
            <button onClick={markAllRead} className="px-3 text-sm font-semibold text-brand-dark">
              모두 읽음
            </button>
          ) : null
        }
      />
      <section className="space-y-2 px-5">
        {items === null ? (
          [0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-3xl bg-sand" />)
        ) : failed ? (
          <p className="py-16 text-center text-sm text-muted">알림을 불러오지 못했어요.</p>
        ) : items.length === 0 ? (
          <div className="py-20 text-center">
            <p className="font-semibold">아직 알림이 없어요</p>
            <p className="mt-1 text-sm text-muted">새 메시지와 관심 알림이 여기에 모여요.</p>
          </div>
        ) : (
          items.map((n) => (
            <button
              key={n.id}
              onClick={async () => {
                if (!n.read_at) await markReadByLink(n.link);
                router.push(n.link);
              }}
              className={`flex w-full items-start gap-3 rounded-3xl border p-4 text-left transition active:scale-[0.99] ${
                n.read_at ? "border-line bg-card" : "border-brand/30 bg-brand-soft/60"
              }`}
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card text-brand-dark ring-1 ring-line">
                <Icon name={n.type === "message" ? "chat" : "heart"} className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate font-semibold">{n.title}</span>
                  <span className="shrink-0 text-xs text-muted">{timeAgo(n.created_at)}</span>
                </span>
                <span className="mt-0.5 block text-sm leading-snug text-muted">{n.body}</span>
              </span>
            </button>
          ))
        )}
      </section>
    </>
  );
}
