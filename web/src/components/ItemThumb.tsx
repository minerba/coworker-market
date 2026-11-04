import { CATEGORY_ICON, CATEGORY_TINT, type Item } from "@/lib/items";
import Icon from "./Icon";

// 사진이 있으면 사진, 없으면 카테고리 아이콘 자리표시
export default function ItemThumb({
  item,
  className,
  iconClass = "h-9 w-9",
}: {
  item: Pick<Item, "category" | "image_urls" | "title">;
  className: string;
  iconClass?: string;
}) {
  const url = item.image_urls[0];
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden text-ink/35 ${className}`}
      style={{ background: CATEGORY_TINT[item.category] }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={item.title} className="h-full w-full object-cover" />
      ) : (
        <Icon name={CATEGORY_ICON[item.category]} className={iconClass} strokeWidth={1.5} />
      )}
    </div>
  );
}
