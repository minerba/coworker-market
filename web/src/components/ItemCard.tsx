import Link from "next/link";
import { STATUS_LABEL, timeAgo, won, type Item } from "@/lib/items";
import Icon from "./Icon";
import ItemThumb from "./ItemThumb";

export default function ItemCard({ item }: { item: Item }) {
  const free = item.price === 0;
  return (
    <Link
      href={`/items/${item.id}`}
      className="flex gap-3 rounded-3xl border border-line bg-card p-3 shadow-sm shadow-amber-900/5 transition active:scale-[0.99]"
    >
      <div className="relative h-24 w-24 shrink-0">
        <ItemThumb item={item} className="h-24 w-24 rounded-2xl" />
        {item.status !== "selling" && (
          <span className="absolute inset-x-0 bottom-0 rounded-b-2xl bg-ink/70 py-0.5 text-center text-[11px] font-medium text-white">
            {STATUS_LABEL[item.status]}
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <div>
          <h3 className="truncate text-[15px] font-semibold">{item.title}</h3>
          <p className="mt-0.5 truncate text-xs text-muted">
            {[item.place, timeAgo(item.created_at)].filter(Boolean).join(" · ")}
          </p>
        </div>
        {free ? (
          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-sage-soft px-2.5 py-0.5 text-sm font-bold text-sage">
            <Icon name="gift" className="h-4 w-4" />
            나눔
          </span>
        ) : (
          <span className="text-base font-bold">{won(item.price)}</span>
        )}
      </div>
    </Link>
  );
}
