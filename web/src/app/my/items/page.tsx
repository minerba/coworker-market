"use client";

import useSWR from "swr";
import ItemCard from "@/components/ItemCard";
import PageHeader from "@/components/PageHeader";
import { useUid } from "@/lib/hooks";
import { fetchMyItems } from "@/lib/queries";

export default function MyItemsPage() {
  const uid = useUid();
  const { data, error, isLoading } = useSWR(uid ? ["mine", uid] : null, () => fetchMyItems(uid!));
  return (
    <>
      <PageHeader title="내가 올린 글" />
      <section className="space-y-3 px-5">
        {isLoading && !data ? (
          [0, 1].map((i) => <div key={i} className="h-30 animate-pulse rounded-3xl bg-sand" />)
        ) : error && !data ? (
          <p className="py-16 text-center text-sm text-muted">목록을 불러오지 못했어요.</p>
        ) : !data || data.length === 0 ? (
          <div className="py-20 text-center">
            <p className="font-semibold">아직 올린 글이 없어요</p>
            <p className="mt-1 text-sm text-muted">쓰지 않는 물건을 동료에게 소개해 보세요.</p>
          </div>
        ) : (
          data.map((item) => <ItemCard key={item.id} item={item} />)
        )}
      </section>
    </>
  );
}
