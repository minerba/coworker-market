"use client";

import { SWRConfig } from "swr";

// 화면을 옮겨도 이전 데이터를 즉시 보여주고, 뒤에서 최신으로 갱신 (체감 속도 개선)
export default function SwrProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        dedupingInterval: 5000,
        focusThrottleInterval: 15000,
        revalidateOnFocus: true,
        keepPreviousData: true,
        errorRetryCount: 2,
      }}
    >
      {children}
    </SWRConfig>
  );
}
