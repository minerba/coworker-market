import { useEffect } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import useSWR from "swr";
import Icon from "@/components/Icon";
import { Empty, Skeleton, T } from "@/components/ui";
import { NOTIFICATION_COLUMNS, useNotifications, type AppNotification } from "@/providers/NotificationProvider";
import { useUid } from "@/providers/AuthProvider";
import { timeAgo } from "@/lib/items";
import { supabase } from "@/lib/supabase";
import { colors } from "@/lib/theme";

async function fetchAll(): Promise<AppNotification[]> {
  const { data, error } = await supabase.from("notifications").select(NOTIFICATION_COLUMNS).order("created_at", { ascending: false }).limit(50);
  if (error) throw error;
  return (data as AppNotification[]) ?? [];
}

export default function NotificationsScreen() {
  const router = useRouter();
  const uid = useUid();
  const { unread, markReadByLink, markAllRead } = useNotifications();
  const { data, error, isLoading, mutate } = useSWR(uid ? ["notifs", uid] : null, fetchAll);

  const unreadCount = unread.length;
  useEffect(() => {
    mutate();
  }, [unreadCount, mutate]);

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          headerRight: () =>
            unreadCount > 0 ? (
              <Pressable onPress={markAllRead} hitSlop={8}>
                <Text style={{ color: colors.brandDark, fontWeight: "600", fontSize: 14 }}>모두 읽음</Text>
              </Pressable>
            ) : null,
        }}
      />
      <FlatList
        data={data ?? []}
        keyExtractor={(n) => String(n.id)}
        contentContainerStyle={{ padding: 20, gap: 8 }}
        ListEmptyComponent={
          isLoading && !data ? (
            <View>
              <Skeleton height={80} />
              <Skeleton height={80} />
            </View>
          ) : error && !data ? (
            <Empty title="알림을 불러오지 못했어요" />
          ) : (
            <Empty title="아직 알림이 없어요" sub="새 메시지와 관심 알림이 여기에 모여요." />
          )
        }
        renderItem={({ item: n }) => (
          <Pressable
            onPress={async () => {
              if (!n.read_at) await markReadByLink(n.link);
              router.push(n.link);
            }}
            style={[s.row, n.read_at ? s.read : s.unread]}
          >
            <View style={s.icon}>
              <Icon name={n.type === "message" ? "chat" : "heart"} size={20} color={colors.brandDark} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                <Text style={{ fontWeight: "600", fontSize: 15, color: colors.ink, flexShrink: 1 }} numberOfLines={1}>
                  {n.title}
                </Text>
                <Text style={T.muted}>{timeAgo(n.created_at)}</Text>
              </View>
              <Text style={{ fontSize: 14, color: colors.muted, marginTop: 2, lineHeight: 20 }}>{n.body}</Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", gap: 12, padding: 16, borderRadius: 24, borderWidth: 1 },
  unread: { backgroundColor: "rgba(253,230,211,0.6)", borderColor: "rgba(240,138,75,0.3)" },
  read: { backgroundColor: colors.card, borderColor: colors.line },
  icon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", marginTop: 2 },
});
