"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import ItemCard from "@/components/ItemCard";
import { useNotifications } from "@/components/NotificationProvider";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { CATEGORIES, ITEM_COLUMNS, type Item } from "@/lib/items";

const FILTERS = ["전체", "나눔", ...CATEGORIES];

export default function Home() {
  const [filter, setFilter] = useState("전체");
  const [items, setItems] = useState<Item[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const { unread } = useNotifications();
  const { session } = useAuth();
  const [bannerHidden, setBannerHidden] = useState(() => {
    try {
      return localStorage.getItem("cm_pw_banner_hidden") === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    supabase
      .from("user_blocks")
      .select("blocked_id")
      .then(({ data }) => setBlocked(new Set((data ?? []).map((b) => b.blocked_id as string))));
  }, []);

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
          <Link href="/notifications" aria-label="알림" className="relative flex h-10 w-10 items-center justify-center rounded-full bg-card text-ink shadow-sm ring-1 ring-line">
            <Icon name="bell" className="h-5 w-5" />
            {unread.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
                {unread.length > 9 ? "9+" : unread.length}
              </span>
            )}
          </Link>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-sand px-4 py-3 text-sm text-muted">
          <Icon name="search" className="h-5 w-5" /> 필요한 물건을 찾아보세요
        </div>
      </header>

      {session && !session.user.user_metadata?.has_password && !bannerHidden && (
        <section className="px-5 pb-3">
          <div className="flex items-center gap-3 rounded-2xl border border-line bg-card p-4">
            <p className="flex-1 text-sm leading-snug">
              <span className="font-semibold">비밀번호를 설정해 두세요.</span>
              <br />
              <span className="text-muted">다른 기기에서도 인증 메일 없이 로그인할 수 있어요.</span>
            </p>
            <Link href="/my" className="shrink-0 rounded-xl bg-brand px-3 py-2 text-sm font-bold text-white">
              설정
            </Link>
            <button
              aria-label="닫기"
              onClick={() => {
                try {
                  localStorage.setItem("cm_pw_banner_hidden", "1");
                } catch {
                  /* 무시 */
                }
                setBannerHidden(true);
              }}
              className="shrink-0 px-1 text-xl leading-none text-muted"
            >
              ×
            </button>
          </div>
        </section>
      )}

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

      <nav className="no-scrollbar mt-4 flex gap-2 overflow-x-auto px-5 py-1">
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
        ) : items.filter((i) => !blocked.has(i.seller_id)).length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-semibold">아직 올라온 물건이 없어요</p>
            <p className="mt-1 text-sm text-muted">첫 번째 물건을 올려 보세요.</p>
          </div>
        ) : (
          items.filter((i) => !blocked.has(i.seller_id)).map((item) => <ItemCard key={item.id} item={item} />)
        )}
      </section>
    </>
  );
}
