"use client";

import { useEffect } from "react";

// 서비스 워커 등록 (운영 환경에서만)
export default function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      /* 등록 실패해도 앱은 정상 동작 */
    });
  }, []);
  return null;
}
