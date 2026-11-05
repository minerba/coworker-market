"use client";

import { useEffect } from "react";
import Link from "next/link";
import useSWR from "swr";
import ItemThumb from "@/components/ItemThumb";
import { useNotifications } from "@/components/NotificationProvider";
import { CONVERSATION_COLUMNS, type Conversation } from "@/lib/chat";
import { useUid } from "@/lib/hooks";
import { timeAgo, won } from "@/lib/items";
import { supabase } from "@/lib/supabase";

async function fetchRooms(): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select(CONVERSATION_COLUMNS)
    .order("last_message_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data as unknown as Conversation[]) ?? [];
}

export default function ChatList() {
  const uid = useUid();
  const { unread } = useNotifications();
  const unreadLinks = new Set(unread.map((n) => n.link));
  const { data: rooms, error, isLoading, mutate } = useSWR(uid ? ["rooms", uid] : null, fetchRooms);

  // 새 메시지 알림이 오면 목록(마지막 메시지, 순서)을 새로 받음
  const unreadCount = unread.length;
  useEffect(() => {
    mutate();
  }, [unreadCount, mutate]);

  return (
    <>
      <header className="px-5 pt-6 pb-3">
        <h1 className="text-xl font-extrabold">채팅</h1>
      </header>
      <section className="space-y-2 px-5">
        {isLoading && !rooms ? (
          [0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-3xl bg-sand" />)
        ) : error && !rooms ? (
          <p className="py-16 text-center text-sm text-muted">채팅 목록을 불러오지 못했어요.</p>
        ) : !rooms || rooms.length === 0 ? (
          <div className="py-20 text-center">
            <p className="font-semibold">아직 대화가 없어요</p>
            <p className="mt-1 text-sm text-muted">마음에 드는 물건에서 채팅을 시작해 보세요.</p>
          </div>
        ) : (
          rooms.map((r) => {
            const other = uid === r.buyer_id ? r.seller : r.buyer;
            const hasUnread = unreadLinks.has(`/chat/${r.id}`);
            return (
              <Link
                key={r.id}
                href={`/chat/${r.id}`}
                className="flex items-center gap-3 rounded-3xl border border-line bg-card p-3 [contain-intrinsic-size:auto_96px] [content-visibility:auto] active:bg-sand"
              >
                {r.items ? (
                  <ItemThumb item={r.items} className="h-14 w-14 shrink-0 rounded-2xl" iconClass="h-6 w-6" />
                ) : (
                  <div className="h-14 w-14 shrink-0 rounded-2xl bg-sand" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="flex items-center gap-1.5 truncate font-semibold">
                      {other?.nickname ?? "알 수 없음"}
                      {hasUnread && <span className="h-2 w-2 shrink-0 rounded-full bg-brand" aria-label="안 읽은 메시지" />}
                    </p>
                    <span className="shrink-0 text-xs text-muted">{timeAgo(r.last_message_at)}</span>
                  </div>
                  <p className={`truncate text-sm ${hasUnread ? "font-semibold text-ink" : "text-muted"}`}>
                    {r.last_message || "대화를 시작해 보세요"}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted/80">
                    {r.items?.title} · {r.items ? won(r.items.price) : ""}
                  </p>
                </div>
              </Link>
            );
          })
        )}
      </section>
    </>
  );
}
