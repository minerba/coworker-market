import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { mutate as globalMutate } from "swr";
import { REPORT_REASONS } from "@/components/ReportSheet";
import { Chip, Empty, Skeleton, T } from "@/components/ui";
import { BUCKET, storagePathFromUrl, withThumbPaths } from "@/lib/image";
import { timeAgo } from "@/lib/items";
import { supabase } from "@/lib/supabase";
import { colors } from "@/lib/theme";

type Report = {
  id: number;
  item_id: number | null;
  reported_user_id: string | null;
  target_label: string;
  reason: string;
  detail: string;
  status: "open" | "resolved" | "dismissed";
  created_at: string;
  reporter: { nickname: string } | null;
};

const COLUMNS = "id, item_id, reported_user_id, target_label, reason, detail, status, created_at, reporter:profiles!reports_reporter_id_fkey(nickname)";

export default function AdminScreen() {
  const router = useRouter();
  const [admin, setAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<"open" | "done">("open");
  const [reports, setReports] = useState<Report[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.rpc("is_admin").then(({ data }) => setAdmin(data === true));
  }, []);

  const load = useCallback(async () => {
    const q = supabase.from("reports").select(COLUMNS).order("created_at", { ascending: false }).limit(100);
    const { data, error } = await (tab === "open" ? q.eq("status", "open") : q.neq("status", "open"));
    setError(error ? "신고 목록을 불러오지 못했어요." : "");
    setReports((data as unknown as Report[]) ?? []);
  }, [tab]);

  useEffect(() => {
    if (admin) load();
  }, [admin, load]);

  async function setStatus(r: Report, status: "resolved" | "dismissed") {
    const { error } = await supabase.from("reports").update({ status }).eq("id", r.id);
    if (error) return setError("처리하지 못했어요. 잠시 후 다시 시도해 주세요.");
    load();
  }

  function removeItem(r: Report) {
    if (!r.item_id) return;
    Alert.alert(`"${r.target_label}" 글을 삭제할까요?`, "삭제하고 처리 완료로 표시해요. 되돌릴 수 없어요.", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          // 삭제하기 전에 사진 경로를 확보해 두었다가 글을 지운 뒤 사진 파일도 정리
          const { data: found } = await supabase.from("items").select("image_urls").eq("id", r.item_id!).maybeSingle();
          const { error } = await supabase.from("items").delete().eq("id", r.item_id!);
          if (error) return setError("글을 삭제하지 못했어요.");
          const paths = ((found?.image_urls as string[] | undefined) ?? []).map(storagePathFromUrl).filter((p): p is string => !!p);
          if (paths.length) await supabase.storage.from(BUCKET).remove(withThumbPaths(paths));
          globalMutate((key) => (Array.isArray(key) && ["items", "item", "mine"].includes(key[0] as string)) || (typeof key === "string" && key.startsWith("$inf$")));
          await setStatus(r, "resolved");
        },
      },
    ]);
  }

  if (admin === null) return null;
  if (!admin) return <Empty title="관리자만 볼 수 있어요" />;

  const reasonLabel = (v: string) => REPORT_REASONS.find((x) => x.value === v)?.label ?? v;

  return (
    <FlatList
      data={reports ?? []}
      keyExtractor={(r) => String(r.id)}
      contentContainerStyle={{ padding: 20, gap: 12 }}
      ListHeaderComponent={
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Chip label="처리 대기" active={tab === "open"} onPress={() => { setReports(null); setTab("open"); }} />
            <Chip label="처리 완료" active={tab === "done"} onPress={() => { setReports(null); setTab("done"); }} />
          </View>
          {error ? <Text style={{ color: colors.danger, fontSize: 14 }}>{error}</Text> : null}
        </View>
      }
      ListEmptyComponent={reports === null ? <Skeleton height={110} /> : <Empty title={tab === "open" ? "처리할 신고가 없어요" : "처리한 신고가 없어요"} />}
      renderItem={({ item: r }) => (
        <View style={s.card}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={s.reason}>
              <Text style={{ color: colors.brandDark, fontSize: 12, fontWeight: "600" }}>{reasonLabel(r.reason)}</Text>
            </View>
            <Text style={T.muted}>{timeAgo(r.created_at)}</Text>
          </View>
          <Text style={{ marginTop: 8, fontWeight: "600", fontSize: 15, color: colors.ink }}>
            {r.item_id ? "글" : "사용자"} · {r.target_label || "(삭제됨)"}
          </Text>
          <Text style={[T.muted, { marginTop: 2 }]}>신고자 {r.reporter?.nickname ?? "알 수 없음"}</Text>
          {r.detail ? <Text style={[T.body, { marginTop: 8, fontSize: 14 }]}>{r.detail}</Text> : null}
          {r.status !== "open" ? (
            <Text style={{ marginTop: 12, fontWeight: "600", color: colors.muted }}>{r.status === "resolved" ? "처리 완료" : "기각"}</Text>
          ) : (
            <View style={s.actions}>
              {r.item_id ? (
                <Pressable onPress={() => router.push(`/items/${r.item_id}`)} style={s.btn}>
                  <Text style={s.btnText}>글 보기</Text>
                </Pressable>
              ) : null}
              {r.item_id ? (
                <Pressable onPress={() => removeItem(r)} style={s.btn}>
                  <Text style={[s.btnText, { color: colors.danger }]}>글 삭제</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={() => setStatus(r, "resolved")} style={[s.btn, { backgroundColor: colors.ink }]}>
                <Text style={[s.btnText, { color: "#fff" }]}>처리 완료</Text>
              </Pressable>
              <Pressable onPress={() => setStatus(r, "dismissed")} style={s.btn}>
                <Text style={s.btnText}>기각</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}
    />
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 24, padding: 16 },
  reason: { backgroundColor: colors.brandSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  btn: { backgroundColor: colors.sand, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  btnText: { fontSize: 14, fontWeight: "600", color: colors.ink },
});
