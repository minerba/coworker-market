"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import InstallBanner from "@/components/InstallBanner";
import ItemCard from "@/components/ItemCard";
import { useAuth } from "@/components/AuthProvider";
import { useNotifications } from "@/components/NotificationProvider";
import { useBlockedIds, useItemList } from "@/lib/hooks";
import { CATEGORIES } from "@/lib/items";

const FILTERS = ["전체", "나눔", ...CATEGORIES];

export default function Home() {
  const [filter, setFilter] = useState("전체");
  const { unread } = useNotifications();
  const { session } = useAuth();
  const blocked = useBlockedIds();
  const [pwBannerHidden, setPwBannerHidden] = useState(() => {
    try {
      return localStorage.getItem("cm_pw_banner_hidden") === "1";
    } catch {
      return false;
    }
  });

  const { items, error, isLoading, isValidating, hasMore, setSize } = useItemList(
    filter === "나눔" ? { freeOnly: true } : filter === "전체" ? {} : { category: filter },
  );
  const visible = items.filter((i) => !blocked.has(i.seller_id));
  const showPwBanner = !!session && !session.user.user_metadata?.has_password && !pwBannerHidden;

  // 목록 끝에 가까워지면 다음 페이지를 미리 불러옴
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isValidating) setSize((s) => s + 1);
      },
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, isValidating, setSize, items.length]);

  return (
    <>
      <header className="sticky top-0 z-10 bg-cream px-5 pt-5 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted">우리 회사 이웃들과 함께</p>
            <h1 className="text-xl font-extrabold tracking-tight">
              코워커<span className="text-brand">마켓</span>
            </h1>
          </div>
          <Link
            href="/notifications"
            aria-label="알림"
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-card text-ink shadow-sm ring-1 ring-line"
          >
            <Icon name="bell" className="h-5 w-5" />
            {unread.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
                {unread.length > 9 ? "9+" : unread.length}
              </span>
            )}
          </Link>
        </div>
        <Link href="/search" className="mt-3 flex items-center gap-2 rounded-2xl bg-sand px-4 py-3 text-sm text-muted">
          <Icon name="search" className="h-5 w-5" /> 필요한 물건을 찾아보세요
        </Link>
      </header>

      {showPwBanner ? (
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
                setPwBannerHidden(true);
              }}
              className="shrink-0 px-1 text-xl leading-none text-muted"
            >
              ×
            </button>
          </div>
        </section>
      ) : (
        <section className="px-5 empty:hidden [&:not(:empty)]:pb-3">
          <InstallBanner />
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
            onClick={() => setFilter(c)}
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
        {isLoading && items.length === 0 ? (
          [0, 1, 2].map((i) => <div key={i} className="h-30 animate-pulse rounded-3xl bg-sand" />)
        ) : error && items.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted">목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>
        ) : visible.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-semibold">아직 올라온 물건이 없어요</p>
            <p className="mt-1 text-sm text-muted">첫 번째 물건을 올려 보세요.</p>
          </div>
        ) : (
          visible.map((item) => <ItemCard key={item.id} item={item} />)
        )}
        {hasMore && <div ref={sentinel} className="h-10" aria-hidden="true" />}
      </section>
    </>
  );
}
