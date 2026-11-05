import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "@/components/Icon";
import ItemCard from "@/components/ItemCard";
import { Chip, Empty, Skeleton, T } from "@/components/ui";
import { useBlockedIds, useItemList } from "@/lib/hooks";
import { CATEGORIES, type Item } from "@/lib/items";
import type { Sort } from "@/lib/queries";
import { colors } from "@/lib/theme";

const SORTS: { value: Sort; label: string }[] = [
  { value: "latest", label: "최신순" },
  { value: "price_asc", label: "낮은 가격순" },
  { value: "price_desc", label: "높은 가격순" },
];
const RECENT_KEY = "cm_recent_searches";

export default function SearchScreen() {
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [freeOnly, setFreeOnly] = useState(false);
  const [sort, setSort] = useState<Sort>("latest");
  const [recent, setRecent] = useState<string[]>([]);
  const blocked = useBlockedIds();

  useEffect(() => {
    AsyncStorage.getItem(RECENT_KEY).then((v) => {
      try {
        const list = JSON.parse(v ?? "[]");
        if (Array.isArray(list)) setRecent(list.filter((x) => typeof x === "string").slice(0, 8));
      } catch {
        /* 무시 */
      }
    });
  }, []);

  // 입력을 멈추고 0.3초 뒤에 검색 (타이핑마다 요청하지 않음)
  useEffect(() => {
    const t = setTimeout(() => setQ(text.trim()), 300);
    return () => clearTimeout(t);
  }, [text]);

  const active = q.length > 0 || category !== "" || freeOnly;
  const { items, error, isLoading, isValidating, hasMore, setSize } = useItemList({ q, category: category || undefined, freeOnly, sort }, active);
  const visible = useMemo(() => items.filter((i) => !blocked.has(i.seller_id)), [items, blocked]);

  const saveRecent = useCallback(
    (term: string) => {
      if (!term) return;
      const next = [term, ...recent.filter((r) => r !== term)].slice(0, 8);
      setRecent(next);
      AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)).catch(() => {});
    },
    [recent],
  );

  const renderItem = useCallback(({ item }: { item: Item }) => <ItemCard item={item} />, []);

  const header = (
    <View style={{ gap: 12 }}>
      <View style={s.inputRow}>
        <Icon name="search" size={20} color={colors.muted} />
        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => {
            setQ(text.trim());
            saveRecent(text.trim());
          }}
          returnKeyType="search"
          placeholder="물건 이름이나 설명으로 검색"
          placeholderTextColor="#b5a898"
          style={s.input}
        />
        {text ? (
          <Pressable onPress={() => setText("")} hitSlop={10} accessibilityLabel="지우기">
            <Icon name="close" size={18} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginHorizontal: -20 }}>
        <View style={{ width: 12 }} />
        <Chip label="나눔만" tone="sage" active={freeOnly} onPress={() => setFreeOnly(!freeOnly)} />
        {CATEGORIES.map((c) => (
          <Chip key={c} label={c} active={category === c} onPress={() => setCategory(category === c ? "" : c)} />
        ))}
        <View style={{ width: 12 }} />
      </ScrollView>
      <View style={{ flexDirection: "row", gap: 16 }}>
        {SORTS.map((o) => (
          <Pressable key={o.value} onPress={() => setSort(o.value)}>
            <Text style={{ fontSize: 14, fontWeight: sort === o.value ? "700" : "400", color: sort === o.value ? colors.ink : colors.muted }}>{o.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
      <FlatList
        data={active ? visible : []}
        keyExtractor={(i) => String(i.id)}
        renderItem={renderItem}
        ListHeaderComponent={<View style={{ paddingTop: 12, paddingBottom: 12 }}>{header}</View>}
        ListEmptyComponent={
          !active ? (
            recent.length > 0 ? (
              <View style={{ gap: 12, paddingTop: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={T.h2}>최근 검색어</Text>
                  <Pressable
                    onPress={() => {
                      setRecent([]);
                      AsyncStorage.removeItem(RECENT_KEY).catch(() => {});
                    }}
                  >
                    <Text style={T.muted}>모두 지우기</Text>
                  </Pressable>
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {recent.map((r) => (
                    <Chip
                      key={r}
                      label={r}
                      onPress={() => {
                        setText(r);
                        setQ(r);
                      }}
                    />
                  ))}
                </View>
              </View>
            ) : (
              <Empty title="찾고 싶은 물건을 검색해 보세요" />
            )
          ) : isLoading && items.length === 0 ? (
            <View>
              <Skeleton />
              <Skeleton />
            </View>
          ) : error && items.length === 0 ? (
            <Empty title="검색하지 못했어요" sub="잠시 후 다시 시도해 주세요." />
          ) : (
            <Empty title="검색 결과가 없어요" sub="다른 검색어나 필터로 찾아보세요." />
          )
        }
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
        onEndReached={() => hasMore && !isValidating && setSize((n) => n + 1)}
        onEndReachedThreshold={0.6}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  inputRow: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.sand, borderRadius: 16, paddingHorizontal: 16 },
  input: { flex: 1, paddingVertical: 13, fontSize: 16, color: colors.ink },
});
