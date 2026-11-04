import type { Item } from "@/lib/mock";
import { won } from "@/lib/mock";
import Icon from "./Icon";

export default function ItemCard({ item }: { item: Item }) {
  const free = item.price === 0;
  return (
    <article className="flex gap-3 rounded-3xl border border-line bg-card p-3 shadow-sm shadow-amber-900/5">
      <div
        className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl text-ink/35"
        style={{ background: item.tint }}
      >
        <Icon name={item.icon} className="h-9 w-9" strokeWidth={1.5} />
        {item.status !== "판매중" && (
          <span className="absolute inset-x-0 bottom-0 rounded-b-2xl bg-ink/70 py-0.5 text-center text-[11px] font-medium text-white">
            {item.status}
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <div>
          <h3 className="truncate text-[15px] font-semibold">{item.title}</h3>
          <p className="mt-0.5 text-xs text-muted">
            {item.place} · {item.time}
          </p>
        </div>
        <div className="flex items-center justify-between">
          {free ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-sage-soft px-2.5 py-0.5 text-sm font-bold text-sage">
              <Icon name="gift" className="h-4 w-4" />
              나눔
            </span>
          ) : (
            <span className="text-base font-bold">{won(item.price)}</span>
          )}
          <span className="flex items-center gap-2.5 text-xs text-muted">
            <span className="flex items-center gap-1">
              <Icon name="heart" className="h-3.5 w-3.5" />
              {item.likes}
            </span>
            <span className="flex items-center gap-1">
              <Icon name="message" className="h-3.5 w-3.5" />
              {item.chats}
            </span>
          </span>
        </div>
      </div>
    </article>
  );
}
