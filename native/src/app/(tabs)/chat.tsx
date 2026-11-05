import { useEffect } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import useSWR from "swr";
import Thumb from "@/components/Thumb";
import { Empty, Skeleton, T } from "@/components/ui";
import { useNotifications } from "@/providers/NotificationProvider";
import { useUid } from "@/providers/AuthProvider";
import { CONVERSATION_COLUMNS, type Conversation } from "@/lib/chat";
import { timeAgo, won } from "@/lib/items";
import { supabase } from "@/lib/supabase";
import { colors } from "@/lib/theme";

async function fetchRooms(): Promise<Conversation[]> {
  const { data, error } = await supabase.from("conversations").select(CONVERSATION_COLUMNS).order("last_message_at", { ascending: false }).limit(100);
  if (error) throw error;
  return (data as unknown as Conversation[]) ?? [];
}

export default function ChatList() {
  const router = useRouter();
  const uid = useUid();
  const { unread } = useNotifications();
  const unreadLinks = new Set(unread.map((n) => n.link));
  const { data: rooms, error, isLoading, mutate } = useSWR(uid ? ["rooms", uid] : null, fetchRooms);

  // 새 메시지 알림이 오면 목록(마지막 메시지, 순서)을 새로 받음
  const unreadCount = unread.length;
  useEffect(() => {
    mutate();
  }, [unreadCount, mutate]);

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
      <Text style={[T.h1, { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }]}>채팅</Text>
      <FlatList
        data={rooms ?? []}
        keyExtractor={(r) => String(r.id)}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        ListEmptyComponent={
          isLoading && !rooms ? (
            <View>
              <Skeleton height={84} />
              <Skeleton height={84} />
            </View>
          ) : error && !rooms ? (
            <Empty title="채팅 목록을 불러오지 못했어요" />
          ) : (
            <Empty title="아직 대화가 없어요" sub="마음에 드는 물건에서 채팅을 시작해 보세요." />
          )
        }
        renderItem={({ item: r }) => {
          const other = uid === r.buyer_id ? r.seller : r.buyer;
          const hasUnread = unreadLinks.has(`/chat/${r.id}`);
          return (
            <Pressable onPress={() => router.push(`/chat/${r.id}`)} style={({ pressed }) => [s.row, pressed && { backgroundColor: colors.sand }]}>
              {r.items ? <Thumb category={r.items.category} urls={r.items.image_urls} style={s.thumb} iconSize={24} /> : <View style={[s.thumb, { backgroundColor: colors.sand }]} />}
              <View style={{ flex: 1 }}>
                <View style={s.top}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 }}>
                    <Text style={s.name} numberOfLines={1}>
                      {other?.nickname ?? "알 수 없음"}
                    </Text>
                    {hasUnread && <View style={s.dot} accessibilityLabel="안 읽은 메시지" />}
                  </View>
                  <Text style={T.muted}>{timeAgo(r.last_message_at)}</Text>
                </View>
                <Text numberOfLines={1} style={{ fontSize: 14, color: hasUnread ? colors.ink : colors.muted, fontWeight: hasUnread ? "600" : "400", marginTop: 2 }}>
                  {r.last_message || "대화를 시작해 보세요"}
                </Text>
                <Text numberOfLines={1} style={[T.muted, { marginTop: 2, fontSize: 12 }]}>
                  {r.items?.title} · {r.items ? won(r.items.price) : ""}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 24, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, marginBottom: 8 },
  thumb: { width: 56, height: 56, borderRadius: 16 },
  top: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 8 },
  name: { fontSize: 15, fontWeight: "600", color: colors.ink },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand },
});
