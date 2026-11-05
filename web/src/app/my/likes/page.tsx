"use client";

import useSWR from "swr";
import ItemCard from "@/components/ItemCard";
import PageHeader from "@/components/PageHeader";
import { useUid } from "@/lib/hooks";
import { fetchLikedItems } from "@/lib/queries";

export default function MyLikesPage() {
  const uid = useUid();
  const { data, error, isLoading } = useSWR(uid ? ["likes", uid] : null, () => fetchLikedItems(uid!));
  return (
    <>
      <PageHeader title="관심 목록" />
      <section className="space-y-3 px-5">
        {isLoading && !data ? (
          [0, 1].map((i) => <div key={i} className="h-30 animate-pulse rounded-3xl bg-sand" />)
        ) : error && !data ? (
          <p className="py-16 text-center text-sm text-muted">목록을 불러오지 못했어요.</p>
        ) : !data || data.length === 0 ? (
          <div className="py-20 text-center">
            <p className="font-semibold">관심 등록한 글이 없어요</p>
            <p className="mt-1 text-sm text-muted">마음에 드는 글의 하트를 눌러 보세요.</p>
          </div>
        ) : (
          data.map((item) => <ItemCard key={item.id} item={item} />)
        )}
      </section>
    </>
  );
}
