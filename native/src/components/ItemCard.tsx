import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import Icon from "./Icon";
import Thumb from "./Thumb";
import { STATUS_LABEL, timeAgo, won, type Item } from "@/lib/items";
import { colors } from "@/lib/theme";

function ItemCard({ item }: { item: Item }) {
  const router = useRouter();
  const free = item.price === 0;
  return (
    <Pressable
      onPress={() => router.push(`/items/${item.id}`)}
      style={({ pressed }) => [s.card, pressed && { backgroundColor: colors.sand }]}
      accessibilityRole="button"
      accessibilityLabel={item.title}
    >
      <View>
        <Thumb category={item.category} urls={item.image_urls} style={s.thumb} />
        {item.status !== "selling" && (
          <View style={s.statusBar}>
            <Text style={s.statusText}>{STATUS_LABEL[item.status]}</Text>
          </View>
        )}
      </View>
      <View style={s.body}>
        <View>
          <Text style={s.title} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={s.meta} numberOfLines={1}>
            {[item.place, timeAgo(item.created_at)].filter(Boolean).join(" · ")}
          </Text>
        </View>
        <View style={s.row}>
          {free ? (
            <View style={s.freeBadge}>
              <Icon name="gift" size={15} color={colors.sage} />
              <Text style={s.freeText}>나눔</Text>
            </View>
          ) : (
            <Text style={s.price}>{won(item.price)}</Text>
          )}
          <View style={s.likes}>
            <Icon name="heart" size={14} color={colors.muted} />
            <Text style={s.meta}>{item.item_likes[0]?.count ?? 0}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default memo(ItemCard);

const s = StyleSheet.create({
  card: { flexDirection: "row", gap: 12, padding: 12, borderRadius: 24, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, marginBottom: 12 },
  thumb: { width: 96, height: 96, borderRadius: 16 },
  statusBar: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "rgba(59,47,39,0.7)", paddingVertical: 2, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  statusText: { color: "#fff", fontSize: 11, fontWeight: "500", textAlign: "center" },
  body: { flex: 1, justifyContent: "space-between", paddingVertical: 2 },
  title: { fontSize: 15, fontWeight: "600", color: colors.ink },
  meta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  price: { fontSize: 16, fontWeight: "700", color: colors.ink },
  freeBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.sageSoft, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  freeText: { color: colors.sage, fontWeight: "700", fontSize: 14 },
  likes: { flexDirection: "row", alignItems: "center", gap: 4 },
});
