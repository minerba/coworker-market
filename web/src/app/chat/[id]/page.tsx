"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useNotifications } from "@/components/NotificationProvider";
import PageHeader from "@/components/PageHeader";
import MoreMenu from "@/components/MoreMenu";
import ReportSheet from "@/components/ReportSheet";
import { blockUser } from "@/lib/block";
import { supabase } from "@/lib/supabase";
import { CONVERSATION_COLUMNS, type Conversation, type Message } from "@/lib/chat";
import { won } from "@/lib/items";

const hhmm = (iso: string) =>
  new Date(iso).toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });

export default function ChatRoom() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [reporting, setReporting] = useState(false);
  const { session } = useAuth();
  const me = session?.user.id;
  const { unread, markReadByLink } = useNotifications();
  const [room, setRoom] = useState<Conversation | null | undefined>(undefined);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

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
      .select("id, conversation_id, sender_id, body, created_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true })
      .limit(500)
      .then(({ data }) => !cancelled && setMessages((prev) => merge(data ?? [], prev)));

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError("");
    const { data, error } = await supabase
      .from("messages")
      .insert({ conversation_id: Number(id), body })
      .select("id, conversation_id, sender_id, body, created_at")
      .single();
    setSending(false);
    if (error) return setError("메시지를 보내지 못했어요. 다시 시도해 주세요.");
    setText("");
    setMessages((prev) => merge(prev, [data as Message]));
  }

  const other = room ? (me === room.buyer_id ? room.seller : room.buyer) : null;
  const otherId = room ? (me === room.buyer_id ? room.seller_id : room.buyer_id) : null;

  async function block() {
    if (!otherId || !confirm(`${other?.nickname ?? "이 사용자"}님을 차단할까요? 더 이상 대화할 수 없어요.`)) return;
    if (await blockUser(otherId)) router.replace("/chat");
    else alert("차단하지 못했어요. 잠시 후 다시 시도해 주세요.");
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
              className="mx-4 mb-2 flex items-center justify-between rounded-2xl bg-sand px-4 py-2.5 text-sm"
            >
              <span className="truncate font-medium">{room.items.title}</span>
              <span className="ml-3 shrink-0 font-bold">{won(room.items.price)}</span>
            </Link>
          )}
          <div className="flex-1 space-y-2 overflow-y-auto px-4 pb-3">
            {messages.length === 0 && (
              <p className="py-10 text-center text-sm text-muted">첫 인사를 건네 보세요.</p>
            )}
            {messages.map((m) => {
              const mine = m.sender_id === me;
              return (
                <div key={m.id} className={`flex items-end gap-1.5 ${mine ? "flex-row-reverse" : ""}`}>
                  <p
                    className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-[15px] leading-snug whitespace-pre-wrap break-words ${
                      mine ? "rounded-br-md bg-brand text-white" : "rounded-bl-md bg-card text-ink ring-1 ring-line"
                    }`}
                  >
                    {m.body}
                  </p>
                  <span className="shrink-0 text-[11px] text-muted">{hhmm(m.created_at)}</span>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
          {error && <p className="px-5 pb-1 text-xs text-red-600">{error}</p>}
          <form
            onSubmit={send}
            className="flex gap-2 border-t border-line bg-card px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={1000}
              placeholder="메시지를 입력하세요"
              className="min-w-0 flex-1 rounded-2xl bg-cream px-4 py-3 text-base outline-none ring-1 ring-line focus:ring-2 focus:ring-brand"
            />
            <button
              disabled={!text.trim() || sending}
              className="shrink-0 rounded-2xl bg-brand px-5 text-base font-bold text-white disabled:opacity-50"
            >
              전송
            </button>
          </form>
        </>
      )}
    </div>
  );
}

// 실시간 이벤트와 직접 응답이 겹쳐도 중복 없이 합치기
function merge(a: Message[], b: Message[]) {
  const map = new Map<number, Message>();
  [...a, ...b].forEach((m) => map.set(m.id, m));
  return [...map.values()].sort((x, y) => x.id - y.id);
}
