import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { mutate } from "swr";
import Icon from "./Icon";
import { Chip, Field, PrimaryButton, T } from "./ui";
import { useUid } from "@/providers/AuthProvider";
import { BUCKET, processImage, storagePathFromUrl, withThumbPaths } from "@/lib/image";
import { CATEGORIES, type Category, type Item } from "@/lib/items";
import { supabase } from "@/lib/supabase";
import { colors } from "@/lib/theme";

const MAX_IMAGES = 5;
type Photo = { key: string; uri: string; existing: boolean }; // existing: 이미 올라가 있는 사진

const invalidateItems = () =>
  mutate((key) => (Array.isArray(key) && ["items", "item", "mine"].includes(key[0] as string)) || (typeof key === "string" && key.startsWith("$inf$")));

const uid4 = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export default function ItemForm({ item }: { item?: Item }) {
  const router = useRouter();
  const uid = useUid();
  const [photos, setPhotos] = useState<Photo[]>((item?.image_urls ?? []).map((url) => ({ key: url, uri: url, existing: true })));
  const [title, setTitle] = useState(item?.title ?? "");
  const [category, setCategory] = useState<Category | "">(item?.category ?? "");
  const [free, setFree] = useState(item ? item.price === 0 : false);
  const [price, setPrice] = useState(item && item.price > 0 ? String(item.price) : "");
  const [place, setPlace] = useState(item?.place ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const priceNum = free ? 0 : Number(price.replace(/\D/g, "") || 0);
  const valid = title.trim().length > 0 && category !== "" && (free || priceNum > 0);

  function addUris(uris: string[]) {
    setPhotos((prev) => [...prev, ...uris.map((uri) => ({ key: uid4(), uri, existing: false }))].slice(0, MAX_IMAGES));
  }

  async function fromLibrary() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: Math.max(1, MAX_IMAGES - photos.length),
      quality: 1,
    });
    if (!res.canceled) addUris(res.assets.map((a) => a.uri));
  }

  async function fromCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return Alert.alert("카메라 권한이 필요해요", "설정에서 카메라 접근을 허용해 주세요.");
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 1 });
    if (!res.canceled) addUris(res.assets.map((a) => a.uri));
  }

  function addPhoto() {
    Alert.alert("사진 추가", undefined, [
      { text: "사진 보관함", onPress: fromLibrary },
      { text: "카메라", onPress: fromCamera },
      { text: "취소", style: "cancel" },
    ]);
  }

  async function submit() {
    if (!valid || !uid || busy) return;
    setBusy(true);
    setError("");
    const uploaded: string[] = [];
    try {
      const urls: string[] = [];
      for (const p of photos) {
        if (p.existing) {
          urls.push(p.uri);
          continue;
        }
        const { full, thumb } = await processImage(p.uri);
        const base = `${uid}/${uid4()}`;
        const opts = { contentType: "image/jpeg", cacheControl: "31536000" };
        const up1 = await supabase.storage.from(BUCKET).upload(`${base}.jpg`, full.buffer as ArrayBuffer, opts);
        if (up1.error) throw up1.error;
        uploaded.push(`${base}.jpg`);
        const up2 = await supabase.storage.from(BUCKET).upload(`${base}_t.jpg`, thumb.buffer as ArrayBuffer, opts);
        if (up2.error) throw up2.error;
        uploaded.push(`${base}_t.jpg`);
        urls.push(supabase.storage.from(BUCKET).getPublicUrl(`${base}.jpg`).data.publicUrl);
      }

      const fields = { title: title.trim(), category, price: priceNum, place: place.trim(), description: description.trim(), image_urls: urls };
      const res = item
        ? await supabase.from("items").update(fields).eq("id", item.id).select("id").single()
        : await supabase.from("items").insert(fields).select("id").single();
      if (res.error) throw res.error;

      // 수정 시 제거된 기존 사진 정리
      if (item) {
        const removed = item.image_urls.filter((u) => !urls.includes(u)).map(storagePathFromUrl).filter((p): p is string => !!p);
        if (removed.length) await supabase.storage.from(BUCKET).remove(withThumbPaths(removed));
      }
      invalidateItems();
      if (item) router.back();
      else {
        setPhotos([]);
        setTitle("");
        setCategory("");
        setFree(false);
        setPrice("");
        setPlace("");
        setDescription("");
        router.push(`/items/${res.data.id}`);
      }
    } catch {
      // 글 저장에 실패하면 방금 올린 사진도 정리
      if (uploaded.length) await supabase.storage.from(BUCKET).remove(uploaded);
      setError("저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
        <View>
          <Text style={s.label}>
            사진 <Text style={s.count}>{photos.length}/{MAX_IMAGES}</Text>
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingTop: 12, paddingRight: 8 }}>
            {photos.length < MAX_IMAGES && (
              <Pressable onPress={addPhoto} style={s.add} accessibilityRole="button" accessibilityLabel="사진 추가">
                <Icon name="camera" size={26} color={colors.muted} />
                <Text style={{ fontSize: 12, color: colors.muted }}>사진 추가</Text>
              </Pressable>
            )}
            {photos.map((p, i) => (
              <View key={p.key} style={s.photo}>
                <Image source={{ uri: p.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                {i === 0 && (
                  <View style={s.main}>
                    <Text style={{ color: "#fff", fontSize: 10 }}>대표</Text>
                  </View>
                )}
                <Pressable onPress={() => setPhotos(photos.filter((x) => x.key !== p.key))} style={s.remove} hitSlop={8} accessibilityLabel="사진 삭제">
                  <Icon name="close" size={14} color="#fff" strokeWidth={2.5} />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={s.label}>제목</Text>
          <Field value={title} onChangeText={setTitle} maxLength={60} placeholder="물건 이름을 알려주세요" />
        </View>

        <View style={{ gap: 10 }}>
          <Text style={s.label}>카테고리</Text>
          <View style={s.chips}>
            {CATEGORIES.map((c) => (
              <Chip key={c} label={c} active={category === c} onPress={() => setCategory(c)} />
            ))}
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <View style={s.priceHead}>
            <Text style={s.label}>가격</Text>
            <View style={s.freeRow}>
              <Icon name="gift" size={16} color={free ? colors.sage : colors.muted} />
              <Text style={{ fontWeight: "600", color: free ? colors.sage : colors.ink }}>나눔</Text>
              <Switch value={free} onValueChange={setFree} trackColor={{ true: colors.sage, false: colors.line }} thumbColor="#fff" />
            </View>
          </View>
          <Field
            value={free ? "" : price}
            onChangeText={(v) => setPrice(v.replace(/\D/g, "").slice(0, 9))}
            editable={!free}
            keyboardType="number-pad"
            placeholder={free ? "무료로 나눔해요" : "0원"}
          />
        </View>

        <View style={{ gap: 8 }}>
          <Text style={s.label}>거래 희망 장소</Text>
          <Field value={place} onChangeText={setPlace} maxLength={40} placeholder="예) A동 1층 로비" />
        </View>

        <View style={{ gap: 8 }}>
          <Text style={s.label}>설명</Text>
          <Field value={description} onChangeText={setDescription} maxLength={2000} multiline placeholder="사용 기간, 상태, 거래 가능한 시간 등을 적어주세요" />
        </View>

        {error ? <Text style={{ color: colors.danger, fontSize: 14 }}>{error}</Text> : null}
        <PrimaryButton title={item ? "수정 완료" : "등록하기"} onPress={submit} disabled={!valid} busy={busy} />
        <Text style={[T.muted, { textAlign: "center" }]}>회사 자산·기밀·금지 물품은 올릴 수 없어요.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 20, gap: 22, paddingBottom: 40 },
  label: { fontSize: 14, fontWeight: "700", color: colors.ink },
  count: { fontWeight: "400", color: colors.muted },
  add: { width: 96, height: 96, borderRadius: 16, backgroundColor: colors.sand, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", gap: 4 },
  photo: { width: 96, height: 96, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: colors.line },
  main: { position: "absolute", left: 4, bottom: 4, backgroundColor: "rgba(59,47,39,0.7)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  remove: { position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  priceHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  freeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
});
