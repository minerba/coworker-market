import { FlatList, View } from "react-native";
import useSWR from "swr";
import ItemCard from "@/components/ItemCard";
import { Empty, Skeleton } from "@/components/ui";
import { useUid } from "@/providers/AuthProvider";
import { fetchLikedItems } from "@/lib/queries";

export default function MyLikes() {
  const uid = useUid();
  const { data, error, isLoading } = useSWR(uid ? ["likes", uid] : null, () => fetchLikedItems(uid!));
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
          <Empty title="관심 등록한 글이 없어요" sub="마음에 드는 글의 하트를 눌러 보세요." />
        )
      }
    />
  );
}
