import { FlatList, View } from "react-native";
import useSWR from "swr";
import ItemCard from "@/components/ItemCard";
import { Empty, Skeleton } from "@/components/ui";
import { useUid } from "@/providers/AuthProvider";
import { fetchMyItems } from "@/lib/queries";

export default function MyItems() {
  const uid = useUid();
  const { data, error, isLoading } = useSWR(uid ? ["mine", uid] : null, () => fetchMyItems(uid!));
  return (
    <FlatList
      data={data ?? []}
      keyExtractor={(i) => String(i.id)}
      renderItem={({ item }) => <ItemCard item={item} />}
      contentContainerStyle={{ padding: 20 }}
      ListEmptyComponent={
        isLoading && !data ? (
          <View>
            <Skeleton />
            <Skeleton />
          </View>
        ) : error && !data ? (
          <Empty title="목록을 불러오지 못했어요" />
        ) : (
          <Empty title="아직 올린 글이 없어요" sub="쓰지 않는 물건을 동료에게 소개해 보세요." />
        )
      }
    />
  );
}
