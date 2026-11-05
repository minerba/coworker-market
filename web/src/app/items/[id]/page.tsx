"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import { useAuth } from "@/components/AuthProvider";
import ItemThumb from "@/components/ItemThumb";
import MoreMenu from "@/components/MoreMenu";
import ReportSheet from "@/components/ReportSheet";
import { blockUser } from "@/lib/block";
import { supabase } from "@/lib/supabase";
import { storagePathFromUrl, BUCKET } from "@/lib/image";
import { ITEM_COLUMNS, STATUS_LABEL, timeAgo, won, type Item, type Status } from "@/lib/items";

export default function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const [item, setItem] = useState<Item | null | undefined>(undefined);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [chatBusy, setChatBusy] = useState(false);
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    supabase
      .from("items")
      .select(ITEM_COLUMNS)
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        const found = (data as unknown as Item) ?? null;
        setItem(found);
        setLikeCount(found?.item_likes[0]?.count ?? 0);
      });
  }, [id]);

  const free = item?.price === 0;
  const mine = !!item && session?.user.id === item.seller_id;

  useEffect(() => {
    if (!item || !session) return;
    supabase
      .from("item_likes")
      .select("item_id")
      .eq("item_id", item.id)
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data }) => setLiked(!!data));
  }, [item, session]);

  async function toggleLike() {
    if (!item || !session) return;
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    const { error } = next
      ? await supabase.from("item_likes").insert({ item_id: item.id })
      : await supabase.from("item_likes").delete().eq("item_id", item.id).eq("user_id", session.user.id);
    if (error) {
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
    }
  }

  async function startChat() {
    if (!item || !session || chatBusy) return;
    setChatBusy(true);
    const existing = await supabase
      .from("conversations")
      .select("id")
      .eq("item_id", item.id)
      .eq("buyer_id", session.user.id)
      .maybeSingle();
    let roomId = existing.data?.id;
    if (!roomId) {
      const created = await supabase.from("conversations").insert({ item_id: item.id }).select("id").single();
      if (created.error) {
        setChatBusy(false);
        return alert("채팅을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.");
      }
      roomId = created.data.id;
    }
    router.push(`/chat/${roomId}`);
  }

  async function changeStatus(status: Status) {
    if (!item || status === item.status) return;
    const { error } = await supabase.from("items").update({ status }).eq("id", item.id);
    if (!error) setItem({ ...item, status });
  }

  async function block() {
    if (!item || !confirm(`${item.profiles?.nickname ?? "이 사용자"}님을 차단할까요? 이 사용자의 글이 보이지 않고 채팅할 수 없어요.`)) return;
    if (await blockUser(item.seller_id)) router.replace("/");
    else alert("차단하지 못했어요. 잠시 후 다시 시도해 주세요.");
  }

  async function remove() {
    if (!item || !confirm("이 게시글을 삭제할까요? 되돌릴 수 없어요.")) return;
    const { error } = await supabase.from("items").delete().eq("id", item.id);
    if (error) return alert("삭제하지 못했어요. 잠시 후 다시 시도해 주세요.");
    const paths = item.image_urls.map(storagePathFromUrl).filter((p): p is string => !!p);
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
    router.replace("/");
  }

  return (
    <div>
      <div className="relative">
        {item && item.image_urls.length > 1 ? (
          <div className="no-scrollbar flex aspect-[4/3] snap-x snap-mandatory overflow-x-auto">
            {item.image_urls.map((u) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={u} src={u} alt={item.title} className="h-full w-full shrink-0 snap-center object-cover" />
            ))}
          </div>
        ) : item ? (
          <ItemThumb item={item} className="aspect-[4/3] w-full" iconClass="h-20 w-20" />
        ) : (
          <div className="aspect-[4/3] w-full animate-pulse bg-sand" />
        )}
        <button
          onClick={() => router.back()}
          aria-label="뒤로"
          className="absolute top-4 left-4 flex h-10 w-10 items-center justify-center rounded-full bg-card/90 text-ink shadow ring-1 ring-line backdrop-blur"
        >
          <Icon name="back" className="h-5 w-5" strokeWidth={2} />
        </button>
        {item && !mine && (
          <MoreMenu
            className="absolute top-4 right-4"
            actions={[
              { label: "신고하기", onClick: () => setReporting(true), danger: true },
              { label: "판매자 차단", onClick: block },
            ]}
          />
        )}
      </div>
      {reporting && item && (
        <ReportSheet target={{ itemId: item.id, label: item.title }} onClose={() => setReporting(false)} />
      )}

      {item === null ? (
        <p className="py-20 text-center text-sm text-muted">삭제되었거나 없는 게시글이에요.</p>
      ) : item ? (
        <div className="px-5 pt-5">
          <div className="flex items-center gap-3 border-b border-line pb-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft text-lg font-bold text-brand-dark">
              {(item.profiles?.nickname ?? "?").slice(0, 1).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold">{item.profiles?.nickname ?? "알 수 없음"}</p>
              <p className="text-xs text-muted">{item.place || "장소 미정"}</p>
            </div>
          </div>

          <div className="pt-4">
            <div className="flex items-center gap-2">
              {item.status !== "selling" && (
                <span className="rounded-full bg-ink px-2.5 py-0.5 text-xs font-medium text-white">
                  {STATUS_LABEL[item.status]}
                </span>
              )}
              <span className="text-xs text-muted">
                {item.category} · {timeAgo(item.created_at)}
              </span>
            </div>
            <h1 className="mt-2 text-xl font-bold leading-snug">{item.title}</h1>
            <p className="mt-2">
              {free ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-sage-soft px-3 py-1 text-base font-bold text-sage">
                  <Icon name="gift" className="h-4 w-4" />
                  나눔
                </span>
              ) : (
                <span className="text-xl font-extrabold">{won(item.price)}</span>
              )}
            </p>
            <p className="mt-5 text-[15px] leading-relaxed whitespace-pre-wrap">
              {item.description || "설명이 없어요."}
            </p>
          </div>

          {mine && (
            <div className="mt-6 rounded-3xl border border-line bg-card p-4">
              <p className="text-sm font-semibold">거래 상태</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(Object.keys(STATUS_LABEL) as Status[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => changeStatus(st)}
                    className={`rounded-xl py-2 text-sm font-medium ring-1 ${
                      item.status === st ? "bg-ink text-white ring-ink" : "bg-cream text-ink ring-line"
                    }`}
                  >
                    {STATUS_LABEL[st]}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <Link href={`/items/${item.id}/edit`} className="flex-1 rounded-xl bg-sand py-2.5 text-center text-sm font-semibold">
                  수정
                </Link>
                <button onClick={remove} className="flex-1 rounded-xl bg-sand py-2.5 text-sm font-semibold text-red-600">
                  삭제
                </button>
              </div>
            </div>
          )}

          <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2 border-t border-line bg-card/95 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleLike}
                aria-label={liked ? "관심 해제" : "관심 등록"}
                aria-pressed={liked}
                className={`flex h-12 w-14 shrink-0 flex-col items-center justify-center rounded-2xl ring-1 ring-line ${
                  liked ? "bg-brand-soft text-brand-dark" : "bg-card text-muted"
                }`}
              >
                <Icon name="heart" className={`h-5 w-5 ${liked ? "fill-current" : ""}`} />
                <span className="text-[10px] leading-none">{likeCount}</span>
              </button>
              <button
                onClick={startChat}
                disabled={mine || chatBusy || item.status === "sold"}
                className="flex-1 rounded-2xl bg-brand py-3.5 text-base font-bold text-white disabled:opacity-50"
              >
                {mine ? "내가 올린 글이에요" : item.status === "sold" ? "거래가 끝났어요" : "채팅하기"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
