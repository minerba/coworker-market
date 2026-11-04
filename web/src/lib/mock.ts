import type { IconName } from "@/components/Icon";

export type Item = {
  id: number;
  title: string;
  price: number; // 0 = 나눔
  place: string;
  time: string;
  likes: number;
  chats: number;
  status: "판매중" | "예약중" | "거래완료";
  icon: IconName; // 사진이 없을 때 보여주는 카테고리 아이콘
  tint: string;
};

export const CATEGORIES = [
  "전체",
  "나눔",
  "가전",
  "가구",
  "도서",
  "패션",
  "육아",
  "취미",
];

export const ITEMS: Item[] = [
  { id: 1, title: "무선 키보드 (거의 새것)", price: 25000, place: "A동 1층 로비", time: "10분 전", likes: 4, chats: 2, status: "판매중", icon: "plug", tint: "#fde6d3" },
  { id: 2, title: "화분 나눔해요 (스투키)", price: 0, place: "B동 카페 앞", time: "32분 전", likes: 9, chats: 6, status: "판매중", icon: "chair", tint: "#e3efe6" },
  { id: 3, title: "모니터 암 싱글", price: 18000, place: "C동 2층", time: "1시간 전", likes: 3, chats: 1, status: "예약중", icon: "plug", tint: "#e8eef8" },
  { id: 4, title: "개발 서적 5권 일괄", price: 30000, place: "A동 3층", time: "3시간 전", likes: 7, chats: 3, status: "판매중", icon: "book", tint: "#fbefc9" },
  { id: 5, title: "아기 옷 나눔 (80사이즈)", price: 0, place: "B동 1층", time: "어제", likes: 12, chats: 8, status: "판매중", icon: "baby", tint: "#fbe0e6" },
  { id: 6, title: "텀블러 세트", price: 8000, place: "D동 로비", time: "어제", likes: 2, chats: 0, status: "거래완료", icon: "cup", tint: "#ece4f6" },
];

export const won = (n: number) => (n === 0 ? "나눔" : `${n.toLocaleString("ko-KR")}원`);
