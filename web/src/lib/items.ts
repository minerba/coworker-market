import type { IconName } from "@/components/Icon";

export const CATEGORIES = ["가전", "가구", "도서", "패션", "육아", "취미", "생활", "기타"] as const;
export type Category = (typeof CATEGORIES)[number];
export type Status = "selling" | "reserved" | "sold";

export type Item = {
  id: number;
  seller_id: string;
  title: string;
  description: string;
  price: number; // 0 = 나눔
  category: Category;
  place: string;
  status: Status;
  image_urls: string[];
  created_at: string;
  profiles: { nickname: string } | null;
  item_likes: { count: number }[];
};

export const ITEM_COLUMNS =
  "id, seller_id, title, description, price, category, place, status, image_urls, created_at, profiles!items_seller_id_fkey(nickname), item_likes(count)";

export const STATUS_LABEL: Record<Status, string> = {
  selling: "판매중",
  reserved: "예약중",
  sold: "거래완료",
};

export const CATEGORY_ICON: Record<Category, IconName> = {
  가전: "plug",
  가구: "chair",
  도서: "book",
  패션: "shirt",
  육아: "baby",
  취미: "music",
  생활: "cup",
  기타: "gift",
};

export const CATEGORY_TINT: Record<Category, string> = {
  가전: "#fde6d3",
  가구: "#e3efe6",
  도서: "#fbefc9",
  패션: "#ece4f6",
  육아: "#fbe0e6",
  취미: "#e8eef8",
  생활: "#f3e9dc",
  기타: "#efe9e1",
};

export const won = (n: number) => (n === 0 ? "나눔" : `${n.toLocaleString("ko-KR")}원`);

export function timeAgo(iso: string) {
  const sec = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return "방금 전";
  if (sec < 3600) return `${Math.floor(sec / 60)}분 전`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}시간 전`;
  if (sec < 86400 * 7) return `${Math.floor(sec / 86400)}일 전`;
  return new Date(iso).toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
}
