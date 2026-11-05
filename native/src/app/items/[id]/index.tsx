import { useState } from "react";
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useSWR, { mutate as globalMutate } from "swr";
import Icon from "@/components/Icon";
import MoreMenu from "@/components/MoreMenu";
import ReportSheet from "@/components/ReportSheet";
import Thumb from "@/components/Thumb";
import { Empty, PrimaryButton, T } from "@/components/ui";
import { useUid } from "@/providers/AuthProvider";
import { blockUser } from "@/lib/block";
import { BUCKET, storagePathFromUrl, withThumbPaths } from "@/lib/image";
import { STATUS_LABEL, timeAgo, won, type Item, type Status } from "@/lib/items";
import { fetchItem } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { colors } from "@/lib/theme";

const refreshLists = () =>
  globalMutate((key) => (Array.isArray(key) && ["items", "mine"].includes(key[0] as string)) || (typeof key === "string" && key.startsWith("$inf$")));

export default function ItemDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const uid = useUid();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { data: item, error, mutate: mutateItem } = useSWR(["item", id], () => fetchItem(id), { keepPreviousData: false });
  const { data: liked, mutate: mutateLiked } = useSWR(
    item && uid ? ["liked", uid, id] : null,
    async () => {
      const { data } = await supabase.from("item_likes").select("item_id").eq("item_id", id).eq("user_id", uid!).maybeSingle();
      return !!data;
    },
    { keepPreviousData: false },
  );
  const [chatBusy, setChatBusy] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  const likeCount = item?.item_likes[0]?.count ?? 0;
  const free = item?.price === 0;
  const mine = !!item && uid === item.seller_id;

  async function toggleLike() {
    if (!item || !uid) return;
    const next = !liked;
    // 누르는 즉시 화면에 반영하고, 실패하면 되돌림
    mutateItem((cur?: Item | null) => (cur ? { ...cur, item_likes: [{ count: Math.max(0, (cur.item_likes[0]?.count ?? 0) + (next ? 1 : -1)) }] } : cur), { revalidate: false });
    await mutateLiked(
      async () => {
        const res = next ? await supabase.from("item_likes").insert({ item_id: item.id }) : await supabase.from("item_likes").delete().eq("item_id", item.id).eq("user_id", uid);
        if (res.error && res.error.code !== "23505") throw res.error;
        return next;
      },
      { optimisticData: next, rollbackOnError: true, revalidate: false },
    ).catch(() => mutateItem());
    globalMutate((key) => Array.isArray(key) && key[0] === "likes");
  }

  async function startChat() {
    if (!item || !uid || chatBusy) return;
    setChatBusy(true);
    const existing = await supabase.from("conversations").select("id").eq("item_id", item.id).eq("buyer_id", uid).maybeSingle();
    let roomId = existing.data?.id;
    if (!roomId) {
      const created = await supabase.from("conversations").insert({ item_id: item.id }).select("id").single();
      if (created.error) {
        setChatBusy(false);
        return Alert.alert("채팅을 시작하지 못했어요", "잠시 후 다시 시도해 주세요.");
      }
      roomId = created.data.id;
      globalMutate((key) => Array.isArray(key) && key[0] === "rooms");
    }
    setChatBusy(false);
    router.push(`/chat/${roomId}`);
  }

  async function changeStatus(status: Status) {
    if (!item || status === item.status) return;
    const { error } = await supabase.from("items").update({ status }).eq("id", item.id);
    if (error) return Alert.alert("상태를 바꾸지 못했어요", "잠시 후 다시 시도해 주세요.");
    mutateItem((cur?: Item | null) => (cur ? { ...cur, status } : cur), { revalidate: false });
    refreshLists();
  }

  function confirmBlock() {
    if (!item) return;
    Alert.alert(`${item.profiles?.nickname ?? "이 사용자"}님을 차단할까요?`, "이 사용자의 글이 보이지 않고 채팅할 수 없어요.", [
      { text: "취소", style: "cancel" },
      {
        text: "차단",
        style: "destructive",
        onPress: async () => {
          if (await blockUser(item.seller_id)) {
            globalMutate((key) => Array.isArray(key) && key[0] === "blocks");
            router.back();
          } else Alert.alert("차단하지 못했어요", "잠시 후 다시 시도해 주세요.");
        },
      },
    ]);
  }

  function confirmRemove() {
    if (!item) return;
    Alert.alert("이 게시글을 삭제할까요?", "되돌릴 수 없어요.", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("items").delete().eq("id", item.id);
          if (error) return Alert.alert("삭제하지 못했어요", "잠시 후 다시 시도해 주세요.");
          const paths = item.image_urls.map(storagePathFromUrl).filter((p): p is string => !!p);
          if (paths.length) await supabase.storage.from(BUCKET).remove(withThumbPaths(paths));
          refreshLists();
          router.back();
        },
      },
    ]);
  }

  const imgH = (width * 3) / 4;

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          headerRight: () =>
            item && !mine ? (
              <MoreMenu
                actions={[
                  { label: "신고하기", danger: true, onPress: () => setReporting(true) },
                  { label: "판매자 차단", onPress: confirmBlock },
                ]}
              />
            ) : null,
        }}
      />
      {error && !item ? (
        <View style={{ alignItems: "center", paddingTop: 80, gap: 12 }}>
          <Text style={T.muted}>게시글을 불러오지 못했어요.</Text>
          <PrimaryButton title="다시 시도" tone="sand" onPress={() => mutateItem()} style={{ paddingHorizontal: 24 }} />
        </View>
      ) : item === null ? (
        <Empty title="삭제되었거나 없는 게시글이에요" />
      ) : !item ? (
        <View style={{ height: imgH, backgroundColor: colors.sand }} />
      ) : (
        <>
          <ScrollView contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}>
            {item.image_urls.length > 0 ? (
              <View>
                <FlatList
                  data={item.image_urls}
                  keyExtractor={(u) => u}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(e) => setPhotoIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
                  renderItem={({ item: u }) => <Image source={{ uri: u }} style={{ width, height: imgH }} contentFit="cover" cachePolicy="memory-disk" transition={150} />}
                />
                {item.image_urls.length > 1 && (
                  <View style={s.counter}>
                    <Text style={{ color: "#fff", fontSize: 12, fontWeight: "500" }}>
                      {photoIndex + 1} / {item.image_urls.length}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <Thumb category={item.category} urls={[]} style={{ width, height: imgH }} iconSize={72} />
            )}

            <View style={{ padding: 20 }}>
              <View style={s.seller}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{(item.profiles?.nickname ?? "?").slice(0, 1).toUpperCase()}</Text>
                </View>
                <View>
                  <Text style={{ fontWeight: "600", fontSize: 15, color: colors.ink }}>{item.profiles?.nickname ?? "알 수 없음"}</Text>
                  <Text style={T.muted}>{item.place || "장소 미정"}</Text>
                </View>
              </View>

              <View style={{ marginTop: 16, flexDirection: "row", alignItems: "center", gap: 8 }}>
                {item.status !== "selling" && (
                  <View style={s.statusPill}>
                    <Text style={{ color: "#fff", fontSize: 12, fontWeight: "500" }}>{STATUS_LABEL[item.status]}</Text>
                  </View>
                )}
                <Text style={T.muted}>
                  {item.category} · {timeAgo(item.created_at)}
                </Text>
              </View>
              <Text style={[T.h1, { marginTop: 8, lineHeight: 30 }]}>{item.title}</Text>
              <View style={{ marginTop: 8, flexDirection: "row" }}>
                {free ? (
                  <View style={s.free}>
                    <Icon name="gift" size={16} color={colors.sage} />
                    <Text style={{ color: colors.sage, fontWeight: "700", fontSize: 16 }}>나눔</Text>
                  </View>
                ) : (
                  <Text style={{ fontSize: 22, fontWeight: "800", color: colors.ink }}>{won(item.price)}</Text>
                )}
              </View>
              <Text style={[T.body, { marginTop: 20 }]}>{item.description || "설명이 없어요."}</Text>

              {mine && (
                <View style={s.owner}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: colors.ink }}>거래 상태</Text>
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                    {(Object.keys(STATUS_LABEL) as Status[]).map((st) => (
                      <Pressable key={st} onPress={() => changeStatus(st)} style={[s.statusBtn, item.status === st && { backgroundColor: colors.ink, borderColor: colors.ink }]}>
                        <Text style={{ fontSize: 14, fontWeight: "500", color: item.status === st ? "#fff" : colors.ink }}>{STATUS_LABEL[st]}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                    <PrimaryButton title="수정" tone="sand" onPress={() => router.push(`/items/${item.id}/edit`)} style={{ flex: 1, minHeight: 44, paddingVertical: 10 }} />
                    <Pressable onPress={confirmRemove} style={[s.del]}>
                      <Text style={{ color: colors.danger, fontWeight: "700" }}>삭제</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          </ScrollView>

          <View style={[s.bar, { paddingBottom: 12 + insets.bottom }]}>
            <Pressable onPress={toggleLike} accessibilityLabel={liked ? "관심 해제" : "관심 등록"} style={[s.like, liked && { backgroundColor: colors.brandSoft }]}>
              <Icon name="heart" size={22} color={liked ? colors.brandDark : colors.muted} filled={!!liked} />
              <Text style={{ fontSize: 10, color: liked ? colors.brandDark : colors.muted }}>{likeCount}</Text>
            </Pressable>
            <PrimaryButton
              title={mine ? "내가 올린 글이에요" : item.status === "sold" ? "거래가 끝났어요" : "채팅하기"}
              onPress={startChat}
              disabled={mine || item.status === "sold"}
              busy={chatBusy}
              style={{ flex: 1 }}
            />
          </View>
          <ReportSheet visible={reporting} target={{ itemId: item.id, label: item.title }} onClose={() => setReporting(false)} />
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  counter: { position: "absolute", right: 16, bottom: 12, backgroundColor: "rgba(59,47,39,0.7)", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  seller: { flexDirection: "row", alignItems: "center", gap: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.line },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 18, fontWeight: "700", color: colors.brandDark },
  statusPill: { backgroundColor: colors.ink, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  free: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.sageSoft, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  owner: { marginTop: 24, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 24, padding: 16 },
  statusBtn: { flex: 1, paddingVertical: 9, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.cream, alignItems: "center" },
  del: { flex: 1, borderRadius: 16, backgroundColor: colors.sand, alignItems: "center", justifyContent: "center", minHeight: 44 },
  bar: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingTop: 12, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.line },
  like: { width: 56, height: 50, borderRadius: 16, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", backgroundColor: colors.card },
});
