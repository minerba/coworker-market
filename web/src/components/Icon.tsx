// 우리끼리 중고마켓 전용 라인 아이콘 세트 (24px 그리드, 1.75 stroke, round cap/join)
const PATHS = {
  camera: "M4 8a1 1 0 0 1 1-1h2.5l1.5-2h6l1.5 2H19a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
  close: "M6 6l12 12M18 6 6 18",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  back: "M15 5l-7 7 7 7",
  home: "M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z",
  search: "M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM15.5 15.5 20 20",
  plus: "M12 5v14M5 12h14",
  chat: "M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-8l-4.5 3.5V16H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z",
  user: "M12 11.5a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5zM5 20a7 7 0 0 1 14 0",
  bell: "M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 1.5h-15zM10 20.5a2 2 0 0 0 4 0",
  heart: "M12 19.5s-7-4.3-7-9.6A3.9 3.9 0 0 1 12 7.6a3.9 3.9 0 0 1 7 2.3c0 5.3-7 9.6-7 9.6z",
  message: "M5 6h14v9H9.5L6 18v-3H5z",
  gift: "M4.5 10h15v9.5h-15zM3.5 7h17v3h-17zM12 7v12.5M12 7C10 7 8.5 6 8.5 4.8S10 3.5 12 7zM12 7c2 0 3.5-1 3.5-2.2S14 3.5 12 7z",
  plug: "M9 4v4M15 4v4M7 8h10v3a5 5 0 0 1-10 0zM12 16v4",
  chair: "M7 4h10v8H7zM6 12h12v3H6zM8 15v5M16 15v5",
  book: "M5 5.5A1.5 1.5 0 0 1 6.5 4H19v13H6.5A1.5 1.5 0 0 0 5 18.5zM5 18.5A1.5 1.5 0 0 0 6.5 20H19v-3",
  shirt: "M9 4 4 7l2 3.5 2-1V20h8V9.5l2 1L20 7l-5-3a3.2 3.2 0 0 1-6 0z",
  baby: "M12 4a2.5 2.5 0 0 1 0 5 2.5 2.5 0 0 1 0-5zM7 20v-5a5 5 0 0 1 10 0v5M9.5 20v-2.5M14.5 20v-2.5",
  music: "M9 17.5V6l10-2v11.5M9 17.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM19 15.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z",
  cup: "M6 5h12l-1.2 13.5a1 1 0 0 1-1 .9H8.2a1 1 0 0 1-1-.9zM6.4 9.5h11.2",
} as const;

export type IconName = keyof typeof PATHS;

export default function Icon({
  name,
  className = "h-6 w-6",
  strokeWidth = 1.75,
}: {
  name: IconName;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
