"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import ItemThumb from "@/components/ItemThumb";
import { supabase } from "@/lib/supabase";
import { ITEM_COLUMNS, STATUS_LABEL, timeAgo, won, type Item } from "@/lib/items";

export default function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<Item | null | undefined>(undefined);

  useEffect(() => {
    supabase
      .from("items")
      .select(ITEM_COLUMNS)
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => setItem((data as unknown as Item) ?? null));
  }, [id]);

  const free = item?.price === 0;

  return (
    <div>
      <div className="relative">
        {item ? (
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
      </div>

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

          <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2 border-t border-line bg-card/95 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
            <button
              disabled
              className="w-full rounded-2xl bg-brand py-3.5 text-base font-bold text-white opacity-50"
            >
              채팅하기 (준비 중)
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
