"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import ItemCard from "@/components/ItemCard";
import { useBlockedIds, useItemList } from "@/lib/hooks";
import type { Sort } from "@/lib/queries";
import { CATEGORIES } from "@/lib/items";

const SORTS: { value: Sort; label: string }[] = [
  { value: "latest", label: "최신순" },
  { value: "price_asc", label: "낮은 가격순" },
  { value: "price_desc", label: "높은 가격순" },
];
const RECENT_KEY = "cm_recent_searches";

function readRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 8) : [];
  } catch {
    return [];
  }
}
function writeRecent(list: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    /* 저장 불가 환경은 무시 */
  }
}

export default function SearchPage() {
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [freeOnly, setFreeOnly] = useState(false);
  const [sort, setSort] = useState<Sort>("latest");
  const [recent, setRecent] = useState<string[]>(readRecent);
  const blocked = useBlockedIds();

  // 입력을 멈추고 0.3초 뒤에 검색 (타이핑마다 요청하지 않음)
  useEffect(() => {
    const t = setTimeout(() => setQ(text.trim()), 300);
    return () => clearTimeout(t);
  }, [text]);

  const active = q.length > 0 || category !== "" || freeOnly;
  const { items, error, isLoading, isValidating, hasMore, setSize } = useItemList(
    { q, category: category || undefined, freeOnly, sort },
    active,
  );
  const visible = items.filter((i) => !blocked.has(i.seller_id));

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

  function remember(term: string) {
    if (!term) return;
    const next = [term, ...recent.filter((r) => r !== term)].slice(0, 8);
    setRecent(next);
    writeRecent(next);
  }

  return (
    <>
      <header className="sticky top-0 z-10 bg-cream px-5 pt-5 pb-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setQ(text.trim());
            remember(text.trim());
          }}
          className="flex items-center gap-2 rounded-2xl bg-sand px-4 ring-1 ring-transparent focus-within:bg-card focus-within:ring-2 focus-within:ring-brand"
        >
          <Icon name="search" className="h-5 w-5 shrink-0 text-muted" />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            enterKeyHint="search"
            autoFocus
            placeholder="물건 이름이나 설명으로 검색"
            className="min-w-0 flex-1 bg-transparent py-3 text-base outline-none placeholder:text-muted/70"
          />
          {text && (
            <button type="button" aria-label="지우기" onClick={() => setText("")} className="px-1 text-xl leading-none text-muted">
              ×
            </button>
          )}
        </form>

        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto py-1">
          <button
            onClick={() => setFreeOnly(!freeOnly)}
            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 ${
              freeOnly ? "bg-sage text-white ring-sage" : "bg-card text-ink ring-line"
            }`}
          >
            <Icon name="gift" className="h-4 w-4" />
            나눔만
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(category === c ? "" : c)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 ${
                category === c ? "bg-ink text-white ring-ink" : "bg-card text-ink ring-line"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="mt-2 flex gap-4 text-sm">
          {SORTS.map((s) => (
            <button
              key={s.value}
              onClick={() => setSort(s.value)}
              className={sort === s.value ? "font-bold text-ink" : "text-muted"}
            >
              {s.label}
            </button>
          ))}
        </div>
      </header>

      <section className="space-y-3 px-5 pt-2">
        {!active ? (
          <div className="pt-4">
            {recent.length > 0 ? (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold">최근 검색어</h2>
                  <button
                    onClick={() => {
                      setRecent([]);
                      writeRecent([]);
                    }}
                    className="text-sm text-muted"
                  >
                    모두 지우기
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {recent.map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        setText(r);
                        setQ(r);
                      }}
                      className="rounded-full bg-card px-3.5 py-1.5 text-sm ring-1 ring-line"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="py-16 text-center text-sm text-muted">찾고 싶은 물건을 검색해 보세요.</p>
            )}
          </div>
        ) : isLoading && items.length === 0 ? (
          [0, 1, 2].map((i) => <div key={i} className="h-30 animate-pulse rounded-3xl bg-sand" />)
        ) : error && items.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted">검색하지 못했어요. 잠시 후 다시 시도해 주세요.</p>
        ) : visible.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-semibold">검색 결과가 없어요</p>
            <p className="mt-1 text-sm text-muted">다른 검색어나 필터로 찾아보세요.</p>
          </div>
        ) : (
          <>
            {visible.map((item) => (
              <div key={item.id} onClick={() => remember(q)}>
                <ItemCard item={item} />
              </div>
            ))}
            {hasMore && <div ref={sentinel} className="h-10" aria-hidden="true" />}
          </>
        )}
      </section>
    </>
  );
}
