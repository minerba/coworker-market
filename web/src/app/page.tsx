"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import ItemCard from "@/components/ItemCard";
import { supabase } from "@/lib/supabase";
import { CATEGORIES, ITEM_COLUMNS, type Item } from "@/lib/items";

const FILTERS = ["전체", "나눔", ...CATEGORIES];

export default function Home() {
  const [filter, setFilter] = useState("전체");
  const [items, setItems] = useState<Item[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let q = supabase.from("items").select(ITEM_COLUMNS).order("created_at", { ascending: false }).limit(50);
    if (filter === "나눔") q = q.eq("price", 0);
    else if (filter !== "전체") q = q.eq("category", filter);
    q.then(({ data, error }) => {
      if (cancelled) return;
      setFailed(!!error);
      setItems((data as unknown as Item[]) ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [filter]);

  return (
    <>
      <header className="sticky top-0 z-10 bg-cream/90 px-5 pt-5 pb-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted">우리 회사 이웃들과 함께</p>
            <h1 className="text-xl font-extrabold tracking-tight">
              코워커<span className="text-brand">마켓</span>
            </h1>
          </div>
          <button aria-label="알림" className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-ink shadow-sm ring-1 ring-line">
            <Icon name="bell" className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-sand px-4 py-3 text-sm text-muted">
          <Icon name="search" className="h-5 w-5" /> 필요한 물건을 찾아보세요
        </div>
      </header>

      <section className="px-5">
        <div className="rounded-3xl bg-gradient-to-br from-brand-soft to-[#fff1e3] p-5">
          <p className="text-sm font-semibold text-brand-dark">이번 주 나눔</p>
          <p className="mt-1 text-lg font-bold leading-snug">
            쓰지 않는 물건,
            <br />
            동료에게 따뜻하게 건네보세요
          </p>
        </div>
      </section>

      <nav className="no-scrollbar mt-5 flex gap-2 overflow-x-auto px-5">
        {FILTERS.map((c) => (
          <button
            key={c}
            onClick={() => {
              setItems(null);
              setFilter(c);
            }}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ring-1 ${
              c === filter ? "bg-ink text-white ring-ink" : "bg-card text-ink ring-line"
            }`}
          >
            {c}
          </button>
        ))}
      </nav>

      <section className="mt-5 space-y-3 px-5">
        <h2 className="text-base font-bold">방금 올라온 물건</h2>
        {items === null ? (
          [0, 1, 2].map((i) => <div key={i} className="h-30 animate-pulse rounded-3xl bg-sand" />)
        ) : failed ? (
          <p className="py-16 text-center text-sm text-muted">목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-semibold">아직 올라온 물건이 없어요</p>
            <p className="mt-1 text-sm text-muted">첫 번째 물건을 올려 보세요.</p>
          </div>
        ) : (
          items.map((item) => <ItemCard key={item.id} item={item} />)
        )}
      </section>
    </>
  );
}
