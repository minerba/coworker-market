"use client";

import { useMemo } from "react";
import useSWR from "swr";
import useSWRInfinite from "swr/infinite";
import { useAuth } from "@/components/AuthProvider";
import type { Item } from "./items";
import { fetchBlockedIds, fetchItemsPage, PAGE_SIZE, type ItemFilter } from "./queries";

export function useUid() {
  const { session } = useAuth();
  return session?.user.id ?? null;
}

// 내가 차단한 사용자 (목록에서 숨김 처리용)
export function useBlockedIds() {
  const uid = useUid();
  const { data } = useSWR(uid ? ["blocks", uid] : null, fetchBlockedIds);
  return useMemo(() => new Set(data ?? []), [data]);
}

// 무한 스크롤 목록 (페이지 단위로 불러오고, 이미 본 화면은 캐시에서 즉시 표시)
export function useItemList(filter: ItemFilter, enabled = true) {
  const uid = useUid();
  const filterKey = JSON.stringify(filter);
  const swr = useSWRInfinite(
    (index, prev: Item[] | null) => {
      if (!enabled || !uid) return null;
      if (prev && prev.length < PAGE_SIZE) return null;
      return ["items", uid, filterKey, index] as const;
    },
    ([, , , index]) => fetchItemsPage(filter, index as number),
    { revalidateFirstPage: true },
  );
  const items = useMemo(() => (swr.data ? swr.data.flat() : []), [swr.data]);
  const last = swr.data?.[swr.data.length - 1];
  const hasMore = !!last && last.length === PAGE_SIZE;
  return { ...swr, items, hasMore };
}
