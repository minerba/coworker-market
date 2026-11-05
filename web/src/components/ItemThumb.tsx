"use client";

import { useState } from "react";
import { CATEGORY_ICON, CATEGORY_TINT, type Item } from "@/lib/items";
import { thumbUrl } from "@/lib/image";
import Icon from "./Icon";

// 사진이 있으면 사진, 없으면 카테고리 아이콘 자리표시.
// 목록에서는 작은 썸네일을 받고(thumb), 썸네일이 없는 예전 글은 원본으로 대체한다.
export default function ItemThumb({
  item,
  className,
  iconClass = "h-9 w-9",
  thumb = true,
  eager = false,
}: {
  item: Pick<Item, "category" | "image_urls" | "title">;
  className: string;
  iconClass?: string;
  thumb?: boolean;
  eager?: boolean;
}) {
  const [thumbFailed, setThumbFailed] = useState(false);
  const url = item.image_urls[0];
  const src = url && thumb && !thumbFailed ? thumbUrl(url) : url;
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden text-ink/35 ${className}`}
      style={{ background: CATEGORY_TINT[item.category] }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={item.title}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onError={() => thumb && setThumbFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <Icon name={CATEGORY_ICON[item.category]} className={iconClass} strokeWidth={1.5} />
      )}
    </div>
  );
}
