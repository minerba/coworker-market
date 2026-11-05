"use client";

import { useEffect, useState } from "react";
import { isNative } from "@/lib/native";
import Icon from "./Icon";

type InstallEvent = Event & { prompt: () => Promise<void> };

function isStandalone() {
  return (
    isNative() ||
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function useInstall() {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [standalone] = useState(isStandalone);
  const [ios] = useState(() => /iPhone|iPad|iPod/.test(navigator.userAgent));

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  return {
    standalone,
    ios,
    canPrompt: !!event,
    prompt: async () => {
      if (!event) return;
      await event.prompt();
      setEvent(null);
    },
  };
}

const DISMISS_KEY = "cm_install_banner_hidden";

// 홈 화면에 추가 안내. 이미 설치된 앱 안이거나 설치할 수 없는 환경(데스크톱 등)에서는 표시하지 않음
export default function InstallBanner({ dismissible = true }: { dismissible?: boolean }) {
  const { standalone, ios, canPrompt, prompt } = useInstall();
  const [hidden, setHidden] = useState(() => {
    try {
      return dismissible && localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  if (standalone || hidden || (!canPrompt && !ios)) return null;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-card p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-dark">
        <Icon name="home" className="h-5 w-5" />
      </span>
      <p className="flex-1 text-sm leading-snug">
        <span className="font-semibold">홈 화면에 추가하면 앱처럼 써요</span>
        <br />
        <span className="text-muted">
          {canPrompt ? "한 번 누르면 바로 설치돼요." : "공유 버튼 → ‘홈 화면에 추가’를 눌러 주세요."}
        </span>
      </p>
      {canPrompt && (
        <button onClick={prompt} className="shrink-0 rounded-xl bg-brand px-3 py-2 text-sm font-bold text-white">
          설치
        </button>
      )}
      {dismissible && (
        <button
          aria-label="닫기"
          onClick={() => {
            try {
              localStorage.setItem(DISMISS_KEY, "1");
            } catch {
              /* 무시 */
            }
            setHidden(true);
          }}
          className="shrink-0 px-1 text-xl leading-none text-muted"
        >
          ×
        </button>
      )}
    </div>
  );
}
