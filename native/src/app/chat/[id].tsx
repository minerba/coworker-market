import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { mutate as globalMutate } from "swr";
import MoreMenu from "@/components/MoreMenu";
import ReportSheet from "@/components/ReportSheet";
import { T } from "@/components/ui";
import { useUid } from "@/providers/AuthProvider";
import { useNotifications } from "@/providers/NotificationProvider";
import { blockUser } from "@/lib/block";
import { CONVERSATION_COLUMNS, MESSAGE_COLUMNS, type Conversation, type Message } from "@/lib/chat";
import { STATUS_LABEL, won, type Status } from "@/lib/items";
import { supabase } from "@/lib/supabase";
import { colors } from "@/lib/theme";

const PAGE = 40;

type Pending = { tempId: string; body: string; failed: boolean };
type Row = { kind: "msg"; m: Message } | { kind: "pending"; p: Pending };

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });
const dayKey = (iso: string) => new Date(iso).toDateString();
const dayLabel = (iso: string) => new Date(iso).toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });

// 실시간 이벤트와 직접 응답이 겹쳐도 중복 없이 합치기 (오래된 순서)
function merge(a: Message[], b: Message[]) {
  const map = new Map<number, Message>();
  [...a, ...b].forEach((m) => map.set(m.id, m));
  return [...map.values()].sort((x, y) => x.id - y.id);
}

export default function ChatRoom() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const me = useUid();
  const { unread, markReadByLink } = useNotifications();

  const [room, setRoom] = useState<Conversation | null | undefined>(undefined);
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [pending, setPending] = useState<Pending[]>([]);
  const [text, setText] = useState("");
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.from("conversations").select(CONVERSATION_COLUMNS).eq("id", id).maybeSingle().then(({ data }) => !cancelled && setRoom((data as unknown as Conversation) ?? null));
    supabase
      .from("messages")
      .select(MESSAGE_COLUMNS)
      .eq("conversation_id", id)
      .order("id", { ascending: false })
      .limit(PAGE)
      .then(({ data }) => {
        if (cancelled) return;
        setMessages((prev) => merge(((data as Message[]) ?? []).slice().reverse(), prev));
        setHasMore((data?.length ?? 0) === PAGE);
      });
    const channel = supabase
      .channel(`room-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` }, (payload) =>
        setMessages((prev) => merge(prev, [payload.new as Message])),
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [id]);

  // 이 방의 안 읽은 알림은 방에 있는 동안 계속 읽음 처리
  useEffect(() => {
    if (unread.some((n) => n.link === `/chat/${id}`)) markReadByLink(`/chat/${id}`);
  }, [unread, id, markReadByLink]);

  const loadOlder = useCallback(async () => {
    const oldest = messages[0]?.id;
    if (!oldest || loadingOlder || !hasMore) return;
    setLoadingOlder(true);
    const { data } = await supabase.from("messages").select(MESSAGE_COLUMNS).eq("conversation_id", id).lt("id", oldest).order("id", { ascending: false }).limit(PAGE);
    setMessages((prev) => merge(((data as Message[]) ?? []).slice().reverse(), prev));
    setHasMore((data?.length ?? 0) === PAGE);
    setLoadingOlder(false);
  }, [messages, loadingOlder, hasMore, id]);

  async function send(retry?: Pending) {
    const body = (retry?.body ?? text).trim();
    if (!body) return;
    const tempId = retry?.tempId ?? String(Math.random());
    if (retry) setPending((p) => p.map((x) => (x.tempId === tempId ? { ...x, failed: false } : x)));
    else {
      setText("");
      setPending((p) => [...p, { tempId, body, failed: false }]);
    }
    const { data, error } = await supabase.from("messages").insert({ conversation_id: Number(id), body }).select(MESSAGE_COLUMNS).single();
    if (error) {
      setPending((p) => p.map((x) => (x.tempId === tempId ? { ...x, failed: true } : x)));
      return;
    }
    setPending((p) => p.filter((x) => x.tempId !== tempId));
    setMessages((prev) => merge(prev, [data as Message]));
    globalMutate((key) => Array.isArray(key) && key[0] === "rooms");
  }

  const other = room ? (me === room.buyer_id ? room.seller : room.buyer) : null;
  const otherId = room ? (me === room.buyer_id ? room.seller_id : room.buyer_id) : null;

  function confirmBlock() {
    if (!otherId) return;
    Alert.alert(`${other?.nickname ?? "이 사용자"}님을 차단할까요?`, "더 이상 대화할 수 없어요.", [
      { text: "취소", style: "cancel" },
      {
        text: "차단",
        style: "destructive",
        onPress: async () => {
          if (await blockUser(otherId)) {
            globalMutate((key) => Array.isArray(key) && (key[0] === "blocks" || key[0] === "rooms"));
            router.back();
          } else Alert.alert("차단하지 못했어요", "잠시 후 다시 시도해 주세요.");
        },
      },
    ]);
  }

  // 최신 메시지가 맨 아래에 오도록 뒤집은 목록(inverted): 전송 중인 메시지 → 최신순 메시지
  const rows: Row[] = useMemo(
    () => [...pending.slice().reverse().map((p): Row => ({ kind: "pending", p })), ...messages.slice().reverse().map((m): Row => ({ kind: "msg", m }))],
    [pending, messages],
  );

  const renderRow = useCallback(
    ({ item: row, index }: { item: Row; index: number }) => {
      if (row.kind === "pending") {
        return (
          <View style={[s.line, s.lineMine]}>
            {row.p.failed ? (
              <Pressable onPress={() => send(row.p)}>
                <Text style={{ fontSize: 11, color: colors.danger, fontWeight: "600" }}>전송 실패 · 다시 보내기</Text>
              </Pressable>
            ) : (
              <Text style={s.time}>전송 중</Text>
            )}
            <View style={[s.bubble, s.mine, { opacity: row.p.failed ? 0.6 : 0.8 }]}>
              <Text style={s.mineText}>{row.p.body}</Text>
            </View>
          </View>
        );
      }
      const m = row.m;
      const mine = m.sender_id === me;
      const older = rows[index + 1];
      const newDay = !older || older.kind === "pending" || dayKey(older.m.created_at) !== dayKey(m.created_at);
      return (
        <View>
          {newDay && (
            <View style={{ alignItems: "center", marginVertical: 12 }}>
              <Text style={s.day}>{dayLabel(m.created_at)}</Text>
            </View>
          )}
          <View style={[s.line, mine && s.lineMine]}>
            <View style={[s.bubble, mine ? s.mine : s.theirs]}>
              <Text style={mine ? s.mineText : s.theirsText}>{m.body}</Text>
            </View>
            <Text style={s.time}>{hhmm(m.created_at)}</Text>
          </View>
        </View>
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [me, rows],
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 96 : 0} style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          title: other?.nickname ?? "채팅",
          headerRight: () =>
            otherId ? (
              <MoreMenu
                actions={[
                  { label: "신고하기", danger: true, onPress: () => setReporting(true) },
                  { label: "차단하기", onPress: confirmBlock },
                ]}
              />
            ) : null,
        }}
      />
      {room === null ? (
        <Text style={[T.muted, { textAlign: "center", paddingTop: 80 }]}>접근할 수 없는 채팅방이에요.</Text>
      ) : (
        <>
          {room?.items && (
            <Pressable onPress={() => router.push(`/items/${room.items!.id}`)} style={s.banner}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                {room.items.status !== "selling" && (
                  <View style={s.pill}>
                    <Text style={{ color: "#fff", fontSize: 11, fontWeight: "500" }}>{STATUS_LABEL[room.items.status as Status] ?? room.items.status}</Text>
                  </View>
                )}
                <Text numberOfLines={1} style={{ flex: 1, fontSize: 14, fontWeight: "500", color: colors.ink }}>
                  {room.items.title}
                </Text>
              </View>
              <Text style={{ fontWeight: "700", color: colors.ink }}>{won(room.items.price)}</Text>
            </Pressable>
          )}
          <FlatList
            inverted
            data={rows}
            keyExtractor={(r) => (r.kind === "pending" ? `p-${r.p.tempId}` : `m-${r.m.id}`)}
            renderItem={renderRow}
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}
            onEndReached={loadOlder}
            onEndReachedThreshold={0.3}
            keyboardShouldPersistTaps="handled"
            ListFooterComponent={loadingOlder ? <Text style={[T.muted, { textAlign: "center", padding: 8 }]}>불러오는 중...</Text> : undefined}
            ListEmptyComponent={room ? <Text style={[T.muted, { textAlign: "center", paddingVertical: 40, transform: [{ scaleY: -1 }] }]}>첫 인사를 건네 보세요.</Text> : undefined}
          />
          <View style={[s.inputBar, { paddingBottom: 10 + insets.bottom }]}>
            <TextInput
              value={text}
              onChangeText={setText}
              maxLength={1000}
              placeholder="메시지를 입력하세요"
              placeholderTextColor="#b5a898"
              style={s.input}
              multiline
              returnKeyType="default"
            />
            <Pressable onPress={() => send()} disabled={!text.trim()} style={[s.send, !text.trim() && { opacity: 0.5 }]} accessibilityRole="button">
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>전송</Text>
            </Pressable>
          </View>
          {otherId && <ReportSheet visible={reporting} target={{ userId: otherId, label: other?.nickname ?? "사용자" }} onClose={() => setReporting(false)} />}
        </>
      )}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  banner: { marginHorizontal: 16, marginBottom: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, backgroundColor: colors.sand, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 10 },
  pill: { backgroundColor: colors.ink, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  line: { flexDirection: "row", alignItems: "flex-end", gap: 6, maxWidth: "100%" },
  lineMine: { flexDirection: "row-reverse" },
  bubble: { maxWidth: "75%", paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18 },
  mine: { backgroundColor: colors.brand, borderBottomRightRadius: 4 },
  theirs: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderBottomLeftRadius: 4 },
  mineText: { color: "#fff", fontSize: 15, lineHeight: 21 },
  theirsText: { color: colors.ink, fontSize: 15, lineHeight: 21 },
  time: { fontSize: 11, color: colors.muted },
  day: { fontSize: 11, color: colors.muted, backgroundColor: colors.sand, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, overflow: "hidden" },
  inputBar: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 16, paddingTop: 10, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.line },
  input: { flex: 1, maxHeight: 120, backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.line, borderRadius: 18, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, fontSize: 16, color: colors.ink },
  send: { backgroundColor: colors.brand, borderRadius: 18, paddingHorizontal: 18, height: 44, alignItems: "center", justifyContent: "center" },
});
