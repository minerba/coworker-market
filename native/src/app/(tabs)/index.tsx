import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "@/components/Icon";
import ItemCard from "@/components/ItemCard";
import { Chip, Empty, Skeleton, T } from "@/components/ui";
import { useAuth } from "@/providers/AuthProvider";
import { useNotifications } from "@/providers/NotificationProvider";
import { useBlockedIds, useItemList } from "@/lib/hooks";
import { CATEGORIES, type Item } from "@/lib/items";
import { colors } from "@/lib/theme";

const FILTERS = ["전체", "나눔", ...CATEGORIES];
const PW_KEY = "cm_pw_banner_hidden";

export default function Home() {
  const router = useRouter();
  const { session } = useAuth();
  const { unread } = useNotifications();
  const blocked = useBlockedIds();
  const [filter, setFilter] = useState("전체");
  const [pwHidden, setPwHidden] = useState(true); // 저장된 값을 읽기 전에는 숨김 (깜빡임 방지)
  useState(() => {
    AsyncStorage.getItem(PW_KEY).then((v) => setPwHidden(v === "1"));
  });

  const { items, error, isLoading, isValidating, hasMore, setSize, mutate } = useItemList(
    filter === "나눔" ? { freeOnly: true } : filter === "전체" ? {} : { category: filter },
  );
  const visible = useMemo(() => items.filter((i) => !blocked.has(i.seller_id)), [items, blocked]);
  const showPw = !!session && !session.user.user_metadata?.has_password && !pwHidden;

  const renderItem = useCallback(({ item }: { item: Item }) => <ItemCard item={item} />, []);
  const loadMore = useCallback(() => {
    if (hasMore && !isValidating) setSize((s) => s + 1);
  }, [hasMore, isValidating, setSize]);

  const header = (
    <View>
      <View style={s.top}>
        <View>
          <Text style={T.muted}>우리 회사 이웃들과 함께</Text>
          <Text style={s.logo}>
            우리<Text style={{ color: colors.brand }}>끼리</Text> 중고마켓
          </Text>
        </View>
        <Pressable onPress={() => router.push("/notifications")} accessibilityLabel="알림" style={s.bell}>
          <Icon name="bell" size={20} />
          {unread.length > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeText}>{unread.length > 9 ? "9+" : unread.length}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <Pressable onPress={() => router.push("/search")} style={s.searchBar} accessibilityRole="search">
        <Icon name="search" size={20} color={colors.muted} />
        <Text style={{ color: colors.muted, fontSize: 14 }}>필요한 물건을 찾아보세요</Text>
      </Pressable>

      {showPw && (
        <View style={s.notice}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: colors.ink }}>비밀번호를 설정해 두세요.</Text>
            <Text style={T.muted}>다른 기기에서도 인증 메일 없이 로그인할 수 있어요.</Text>
          </View>
          <Pressable onPress={() => router.push("/my")} style={s.noticeBtn}>
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>설정</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setPwHidden(true);
              AsyncStorage.setItem(PW_KEY, "1").catch(() => {});
            }}
            hitSlop={10}
          >
            <Icon name="close" size={18} color={colors.muted} />
          </Pressable>
        </View>
      )}

      <View style={s.hero}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: colors.brandDark }}>이번 주 나눔</Text>
        <Text style={{ fontSize: 18, fontWeight: "700", color: colors.ink, marginTop: 4, lineHeight: 26 }}>
          쓰지 않는 물건,{"\n"}동료에게 따뜻하게 건네보세요
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips} style={{ marginHorizontal: -20 }}>
        {FILTERS.map((c) => (
          <Chip key={c} label={c} active={c === filter} onPress={() => setFilter(c)} />
        ))}
      </ScrollView>
      <Text style={[T.h2, { marginTop: 12, marginBottom: 12 }]}>방금 올라온 물건</Text>
    </View>
  );

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
      <FlatList
        data={visible}
        keyExtractor={(i) => String(i.id)}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ListEmptyComponent={
          isLoading && items.length === 0 ? (
            <View>
              <Skeleton />
              <Skeleton />
              <Skeleton />
            </View>
          ) : error && items.length === 0 ? (
            <Empty title="목록을 불러오지 못했어요" sub="잠시 후 다시 시도해 주세요." />
          ) : (
            <Empty title="아직 올라온 물건이 없어요" sub="첫 번째 물건을 올려 보세요." />
          )
        }
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.6}
        refreshControl={<RefreshControl refreshing={false} onRefresh={async () => { await mutate(); }} tintColor={colors.brand} />}
        initialNumToRender={8}
        windowSize={7}
        removeClippedSubviews
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 12 },
  logo: { fontSize: 22, fontWeight: "800", color: colors.ink },
  bell: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  badge: { position: "absolute", top: -2, right: -2, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.sand, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 13, marginTop: 12 },
  notice: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, borderRadius: 16, padding: 14, marginTop: 12 },
  noticeBtn: { backgroundColor: colors.brand, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  hero: { backgroundColor: colors.brandSoft, borderRadius: 24, padding: 20, marginTop: 12 },
  chips: { flexDirection: "row", gap: 8, paddingHorizontal: 20, paddingVertical: 4, marginTop: 16 },
});
