"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon, { type IconName } from "./Icon";

const TABS: { href: string; label: string; icon: IconName; primary?: boolean }[] = [
  { href: "/", label: "홈", icon: "home" },
  { href: "/search", label: "탐색", icon: "search" },
  { href: "/sell", label: "등록", icon: "plus", primary: true },
  { href: "/chat", label: "채팅", icon: "chat" },
  { href: "/my", label: "내 정보", icon: "user" },
];

export default function BottomNav() {
  const pathname = usePathname();
  if (pathname === "/login" || pathname.startsWith("/items/") || pathname === "/sell") return null;
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
                  <Icon name={t.icon} strokeWidth={t.primary ? 2.25 : active ? 2 : 1.75} />
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
