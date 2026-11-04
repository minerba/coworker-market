"use client";

import { useRouter } from "next/navigation";
import Icon from "./Icon";

export default function PageHeader({ title }: { title: string }) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-10 flex items-center gap-2 bg-cream/90 px-3 py-3 backdrop-blur">
      <button onClick={() => router.back()} aria-label="뒤로" className="flex h-10 w-10 items-center justify-center text-ink">
        <Icon name="back" className="h-6 w-6" strokeWidth={2} />
      </button>
      <h1 className="text-lg font-bold">{title}</h1>
    </header>
  );
}
