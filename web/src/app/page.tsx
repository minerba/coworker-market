import ItemCard from "@/components/ItemCard";
import { CATEGORIES, ITEMS } from "@/lib/mock";

export default function Home() {
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
          <button aria-label="알림" className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-lg shadow-sm ring-1 ring-line">
            🔔
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-sand px-4 py-3 text-sm text-muted">
          <span>🔍</span> 필요한 물건을 찾아보세요
        </div>
      </header>

      <section className="px-5">
        <div className="rounded-3xl bg-gradient-to-br from-brand-soft to-[#fff1e3] p-5">
          <p className="text-sm font-semibold text-brand-dark">이번 주 나눔</p>
          <p className="mt-1 text-lg font-bold leading-snug">
            쓰지 않는 물건,
            <br />
            동료에게 따뜻하게 건네보세요 🧡
          </p>
        </div>
      </section>

      <nav className="no-scrollbar mt-5 flex gap-2 overflow-x-auto px-5">
        {CATEGORIES.map((c, i) => (
          <button
            key={c.label}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium ring-1 ${
              i === 0 ? "bg-ink text-white ring-ink" : "bg-card text-ink ring-line"
            }`}
          >
            <span>{c.emoji}</span>
            {c.label}
          </button>
        ))}
      </nav>

      <section className="mt-5 space-y-3 px-5">
        <h2 className="text-base font-bold">방금 올라온 물건</h2>
        {ITEMS.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </section>
    </>
  );
}
