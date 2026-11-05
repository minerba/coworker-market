"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon, { type IconName } from "./Icon";
import { useNotifications } from "./NotificationProvider";

const TABS: { href: string; label: string; icon: IconName; primary?: boolean }[] = [
  { href: "/", label: "홈", icon: "home" },
  { href: "/search", label: "탐색", icon: "search" },
  { href: "/sell", label: "등록", icon: "plus", primary: true },
  { href: "/chat", label: "채팅", icon: "chat" },
  { href: "/my", label: "내 정보", icon: "user" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { unread } = useNotifications();
  const chatUnread = unread.filter((n) => n.type === "message").length;
  if (pathname === "/login" || pathname === "/terms" || pathname === "/privacy" || pathname.startsWith("/items/") || pathname === "/sell" || pathname.startsWith("/chat/") || pathname === "/admin" || pathname === "/notifications") return null;
  return (
    <nav className="fixed bottom-0 left-1/2 z-20 w-full max-w-md -translate-x-1/2 border-t border-line bg-card pb-[env(safe-area-inset-bottom)]">
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
                      : `relative flex h-7 w-7 items-center justify-center ${active ? "text-brand" : "text-muted"}`
                  }
                >
                  <Icon name={t.icon} strokeWidth={t.primary ? 2.25 : active ? 2 : 1.75} />
                  {t.href === "/chat" && chatUnread > 0 && (
                    <span className="absolute -top-0.5 right-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
                      {chatUnread > 9 ? "9+" : chatUnread}
                    </span>
                  )}
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
