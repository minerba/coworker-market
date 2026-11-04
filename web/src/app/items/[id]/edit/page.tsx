"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ItemForm from "@/components/ItemForm";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { ITEM_COLUMNS, type Item } from "@/lib/items";

export default function EditItem() {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();
  const [item, setItem] = useState<Item | null | undefined>(undefined);

  useEffect(() => {
    supabase
      .from("items")
      .select(ITEM_COLUMNS)
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => setItem((data as unknown as Item) ?? null));
  }, [id]);

  const mine = item && session?.user.id === item.seller_id;
  return (
    <>
      <PageHeader title="게시글 수정" />
      {item === undefined ? (
        <div className="mx-5 h-40 animate-pulse rounded-3xl bg-sand" />
      ) : mine ? (
        <ItemForm item={item} />
      ) : (
        <p className="py-20 text-center text-sm text-muted">수정할 수 없는 게시글이에요.</p>
      )}
    </>
  );
}
