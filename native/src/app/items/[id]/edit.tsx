import { Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import useSWR from "swr";
import ItemForm from "@/components/ItemForm";
import { Empty } from "@/components/ui";
import { useUid } from "@/providers/AuthProvider";
import { fetchItem } from "@/lib/queries";

export default function EditItem() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const uid = useUid();
  const { data: item, error, isLoading } = useSWR(["item", id], () => fetchItem(id), { keepPreviousData: false });
  if (isLoading && item === undefined) return <Text style={{ padding: 20 }}>불러오는 중...</Text>;
  if (error || !item || item.seller_id !== uid) return <Empty title="수정할 수 없는 게시글이에요" />;
  return <ItemForm item={item} />;
}
