"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { useNotifications } from "@/components/NotificationProvider";
import { supabase } from "@/lib/supabase";
import { CONVERSATION_COLUMNS, type Conversation } from "@/lib/chat";
import { timeAgo, won } from "@/lib/items";

export default function ChatList() {
  const { session } = useAuth();
  const { unread } = useNotifications();
  const unreadLinks = new Set(unread.map((n) => n.link));
  const [rooms, setRooms] = useState<Conversation[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    supabase
      .from("conversations")
      .select(CONVERSATION_COLUMNS)
      .order("last_message_at", { ascending: false })
      .then(({ data, error }) => {
        setFailed(!!error);
        setRooms((data as unknown as Conversation[]) ?? []);
      });
  }, []);

  return (
    <>
      <header className="px-5 pt-6 pb-3">
        <h1 className="text-xl font-extrabold">채팅</h1>
      </header>
      <section className="space-y-2 px-5">
        {rooms === null ? (
          [0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-3xl bg-sand" />)
        ) : failed ? (
          <p className="py-16 text-center text-sm text-muted">채팅 목록을 불러오지 못했어요.</p>
        ) : rooms.length === 0 ? (
          <div className="py-20 text-center">
            <p className="font-semibold">아직 대화가 없어요</p>
            <p className="mt-1 text-sm text-muted">마음에 드는 물건에서 채팅을 시작해 보세요.</p>
          </div>
        ) : (
          rooms.map((r) => {
            const other = session?.user.id === r.buyer_id ? r.seller : r.buyer;
            return (
              <Link
                key={r.id}
                href={`/chat/${r.id}`}
                className="flex items-center gap-3 rounded-3xl border border-line bg-card p-4 transition active:scale-[0.99]"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-lg font-bold text-brand-dark">
                  {(other?.nickname ?? "?").slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="flex items-center gap-1.5 truncate font-semibold">
                      {other?.nickname ?? "알 수 없음"}
                      {unreadLinks.has(`/chat/${r.id}`) && <span className="h-2 w-2 shrink-0 rounded-full bg-brand" aria-label="안 읽은 메시지" />}
                    </p>
                    <span className="shrink-0 text-xs text-muted">{timeAgo(r.last_message_at)}</span>
                  </div>
                  <p className="truncate text-sm text-muted">{r.last_message || "대화를 시작해 보세요"}</p>
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
