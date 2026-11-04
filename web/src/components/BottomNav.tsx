"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "홈", icon: "M3 11l9-8 9 8v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z" },
  { href: "/search", label: "탐색", icon: "M11 4a7 7 0 105.2 11.7l4 4 1.4-1.4-4-4A7 7 0 0011 4z" },
  { href: "/sell", label: "등록", icon: "M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z", primary: true },
  { href: "/chat", label: "채팅", icon: "M4 4h16a1 1 0 011 1v11a1 1 0 01-1 1H8l-5 4V5a1 1 0 011-1z" },
  { href: "/my", label: "내 정보", icon: "M12 12a4 4 0 100-8 4 4 0 000 8zm-8 9a8 8 0 0116 0z" },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-1/2 z-20 w-full max-w-md -translate-x-1/2 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="flex items-end justify-around px-2 pt-2 pb-2">
        {TABS.map((t) => {
          const active = pathname === t.href;
          return (
            <li key={t.href}>
              <Link href={t.href} className="flex w-16 flex-col items-center gap-1">
                <span
                  className={
                    t.primary
                      ? "-mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-brand/40"
                      : `flex h-7 w-7 items-center justify-center ${active ? "text-brand" : "text-muted"}`
                  }
                >
                  <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
                    <path d={t.icon} />
                  </svg>
                </span>
                <span className={`text-[11px] ${active ? "font-semibold text-brand" : "text-muted"}`}>
                  {t.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
