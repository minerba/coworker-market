"use client";

import { useEffect } from "react";
import { isNative, setupNativeShell } from "@/lib/native";

// 앱 안에서만 동작: 뒤로가기 버튼, 상태바 설정
export default function NativeShell() {
  useEffect(() => {
    if (isNative()) setupNativeShell();
  }, []);
  return null;
}
