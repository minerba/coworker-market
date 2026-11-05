"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { mutate as globalMutate } from "swr";
import { useAuth } from "@/components/AuthProvider";
import MoreMenu from "@/components/MoreMenu";
import { useNotifications } from "@/components/NotificationProvider";
import PageHeader from "@/components/PageHeader";
import ReportSheet from "@/components/ReportSheet";
import { blockUser } from "@/lib/block";
import { CONVERSATION_COLUMNS, MESSAGE_COLUMNS, type Conversation, type Message } from "@/lib/chat";
import { STATUS_LABEL, won, type Status } from "@/lib/items";
import { supabase } from "@/lib/supabase";

const PAGE = 40;

type Pending = { tempId: string; body: string; failed: boolean };

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });
const dayKey = (iso: string) => new Date(iso).toDateString();
const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });

// 실시간 이벤트와 직접 응답이 겹쳐도 중복 없이 합치기
function merge(a: Message[], b: Message[]) {
  const map = new Map<number, Message>();
  [...a, ...b].forEach((m) => map.set(m.id, m));
  return [...map.values()].sort((x, y) => x.id - y.id);
}

export default function ChatRoom() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const me = session?.user.id;
  const { unread, markReadByLink } = useNotifications();

  const [room, setRoom] = useState<Conversation | null | undefined>(undefined);
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [pending, setPending] = useState<Pending[]>([]);
  const [text, setText] = useState("");
  const [reporting, setReporting] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true); // 바닥 근처를 보고 있으면 새 메시지에 맞춰 따라 내려감
  const prevHeightRef = useRef<number | null>(null); // 이전 메시지를 불러올 때 스크롤 위치 유지용

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("conversations")
      .select(CONVERSATION_COLUMNS)
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => !cancelled && setRoom((data as unknown as Conversation) ?? null));
    supabase
      .from("messages")
      .select(MESSAGE_COLUMNS)
      .eq("conversation_id", id)
      .order("id", { ascending: false })
      .limit(PAGE)
      .then(({ data }) => {
        if (cancelled) return;
        const list = ((data as Message[]) ?? []).slice().reverse();
        setMessages((prev) => merge(list, prev));
        setHasMore((data?.length ?? 0) === PAGE);
      });

    const channel = supabase
      .channel(`room-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        (payload) => setMessages((prev) => merge(prev, [payload.new as Message])),
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [id]);

  // 이 방의 안 읽은 알림은 방에 있는 동안 계속 읽음 처리
  useEffect(() => {
    if (unread.some((n) => n.link === `/chat/${id}`)) markReadByLink(`/chat/${id}`);
  }, [unread, id, markReadByLink]);

  // 새 메시지가 오면 바닥으로, 이전 메시지를 불러오면 보던 위치 유지
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (prevHeightRef.current !== null) {
      el.scrollTop += el.scrollHeight - prevHeightRef.current;
      prevHeightRef.current = null;
    } else if (stickRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, pending]);

  const loadOlder = useCallback(async () => {
    const oldest = messages[0]?.id;
    if (!oldest || loadingOlder) return;
    setLoadingOlder(true);
    const { data } = await supabase
      .from("messages")
      .select(MESSAGE_COLUMNS)
      .eq("conversation_id", id)
      .lt("id", oldest)
      .order("id", { ascending: false })
      .limit(PAGE);
    prevHeightRef.current = listRef.current?.scrollHeight ?? null;
    setMessages((prev) => merge(((data as Message[]) ?? []).slice().reverse(), prev));
    setHasMore((data?.length ?? 0) === PAGE);
    setLoadingOlder(false);
  }, [messages, loadingOlder, id]);

  async function send(retry?: Pending) {
    const body = (retry?.body ?? text).trim();
    if (!body) return;
    const tempId = retry?.tempId ?? crypto.randomUUID();
    stickRef.current = true;
    if (retry) setPending((p) => p.map((x) => (x.tempId === tempId ? { ...x, failed: false } : x)));
    else {
      setText("");
      setPending((p) => [...p, { tempId, body, failed: false }]);
    }
    const { data, error } = await supabase
      .from("messages")
      .insert({ conversation_id: Number(id), body })
      .select(MESSAGE_COLUMNS)
      .single();
    if (error) {
      setPending((p) => p.map((x) => (x.tempId === tempId ? { ...x, failed: true } : x)));
      return;
    }
    setPending((p) => p.filter((x) => x.tempId !== tempId));
    setMessages((prev) => merge(prev, [data as Message]));
    globalMutate((key) => Array.isArray(key) && key[0] === "rooms");
  }

  const other = room ? (me === room.buyer_id ? room.seller : room.buyer) : null;
  const otherId = room ? (me === room.buyer_id ? room.seller_id : room.buyer_id) : null;

  async function block() {
    if (!otherId || !confirm(`${other?.nickname ?? "이 사용자"}님을 차단할까요? 더 이상 대화할 수 없어요.`)) return;
    if (await blockUser(otherId)) {
      globalMutate((key) => Array.isArray(key) && (key[0] === "blocks" || key[0] === "rooms"));
      router.replace("/chat");
    } else alert("차단하지 못했어요. 잠시 후 다시 시도해 주세요.");
  }

  return (
    <div className="flex h-dvh flex-col">
      <PageHeader
        title={other?.nickname ?? "채팅"}
        right={
          otherId ? (
            <MoreMenu
              className="mr-2"
              actions={[
                { label: "신고하기", onClick: () => setReporting(true), danger: true },
                { label: "차단하기", onClick: block },
              ]}
            />
          ) : null
        }
      />
      {reporting && otherId && (
        <ReportSheet target={{ userId: otherId, label: other?.nickname ?? "사용자" }} onClose={() => setReporting(false)} />
      )}

      {room === null ? (
        <p className="py-20 text-center text-sm text-muted">접근할 수 없는 채팅방이에요.</p>
      ) : (
        <>
          {room?.items && (
            <Link
              href={`/items/${room.items.id}`}
              className="mx-4 mb-2 flex items-center justify-between gap-3 rounded-2xl bg-sand px-4 py-2.5 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2">
                {room.items.status !== "selling" && (
                  <span className="shrink-0 rounded-full bg-ink px-2 py-0.5 text-[11px] font-medium text-white">
                    {STATUS_LABEL[room.items.status as Status] ?? room.items.status}
                  </span>
                )}
                <span className="truncate font-medium">{room.items.title}</span>
              </span>
              <span className="shrink-0 font-bold">{won(room.items.price)}</span>
            </Link>
          )}

          <div
            ref={listRef}
            onScroll={(e) => {
              const el = e.currentTarget;
              stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
            }}
            className="flex-1 space-y-2 overflow-y-auto px-4 pb-3"
          >
            {hasMore && (
              <button
                onClick={loadOlder}
                disabled={loadingOlder}
                className="mx-auto block rounded-full bg-sand px-4 py-1.5 text-xs font-semibold text-muted disabled:opacity-60"
              >
                {loadingOlder ? "불러오는 중..." : "이전 메시지 더 보기"}
              </button>
            )}
            {messages.length === 0 && pending.length === 0 && room && (
              <p className="py-10 text-center text-sm text-muted">첫 인사를 건네 보세요.</p>
            )}
            {messages.map((m, i) => {
              const mine = m.sender_id === me;
              const newDay = i === 0 || dayKey(messages[i - 1].created_at) !== dayKey(m.created_at);
              return (
                <div key={m.id}>
                  {newDay && (
                    <p className="my-3 text-center">
                      <span className="rounded-full bg-sand px-3 py-1 text-[11px] text-muted">{dayLabel(m.created_at)}</span>
                    </p>
                  )}
                  <div className={`flex items-end gap-1.5 ${mine ? "flex-row-reverse" : ""}`}>
                    <p
                      className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-[15px] leading-snug whitespace-pre-wrap break-words ${
                        mine ? "rounded-br-md bg-brand text-white" : "rounded-bl-md bg-card text-ink ring-1 ring-line"
                      }`}
                    >
                      {m.body}
                    </p>
                    <span className="shrink-0 text-[11px] text-muted">{hhmm(m.created_at)}</span>
                  </div>
                </div>
              );
            })}
            {pending.map((p) => (
              <div key={p.tempId} className="flex flex-row-reverse items-end gap-1.5">
                <p
                  className={`max-w-[75%] rounded-2xl rounded-br-md bg-brand px-3.5 py-2 text-[15px] leading-snug whitespace-pre-wrap break-words text-white ${
                    p.failed ? "opacity-60" : "opacity-80"
                  }`}
                >
                  {p.body}
                </p>
                {p.failed ? (
                  <button onClick={() => send(p)} className="shrink-0 text-[11px] font-semibold text-red-600">
                    전송 실패 · 다시 보내기
                  </button>
                ) : (
                  <span className="shrink-0 text-[11px] text-muted">전송 중</span>
                )}
              </div>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex gap-2 border-t border-line bg-card px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={1000}
              enterKeyHint="send"
              placeholder="메시지를 입력하세요"
              className="min-w-0 flex-1 rounded-2xl bg-cream px-4 py-3 text-base outline-none ring-1 ring-line focus:ring-2 focus:ring-brand"
            />
            <button disabled={!text.trim()} className="shrink-0 rounded-2xl bg-brand px-5 text-base font-bold text-white disabled:opacity-50">
              전송
            </button>
          </form>
        </>
      )}
    </div>
  );
}
