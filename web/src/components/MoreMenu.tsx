"use client";

import { useState } from "react";
import Icon from "./Icon";

export type MenuAction = { label: string; onClick: () => void; danger?: boolean };

export default function MoreMenu({ actions, className = "" }: { actions: MenuAction[]; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="더보기"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-card/90 text-ink shadow ring-1 ring-line backdrop-blur"
      >
        <Icon name="more" className="h-5 w-5" strokeWidth={2.5} />
      </button>
      {open && (
        <>
          <button aria-label="닫기" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
          <ul className="absolute right-0 z-50 mt-2 w-40 overflow-hidden rounded-2xl border border-line bg-card shadow-lg">
            {actions.map((a) => (
              <li key={a.label}>
                <button
                  onClick={() => {
                    setOpen(false);
                    a.onClick();
                  }}
                  className={`w-full px-4 py-3 text-left text-sm font-medium active:bg-sand ${a.danger ? "text-red-600" : ""}`}
                >
                  {a.label}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
