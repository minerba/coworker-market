import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { mutate } from "swr";
import { PrimaryButton, T } from "@/components/ui";
import { useUid } from "@/providers/AuthProvider";
import { TERMS_VERSION } from "@/lib/legal";
import { supabase } from "@/lib/supabase";
import { colors } from "@/lib/theme";

function Check({ checked, onToggle, children }: { checked: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <Pressable onPress={onToggle} style={s.row} accessibilityRole="checkbox" accessibilityState={{ checked }}>
      <View style={[s.box, checked && s.boxOn]}>{checked ? <Text style={s.tick}>✓</Text> : null}</View>
      <Text style={[T.body, { flex: 1, fontSize: 14, lineHeight: 20 }]}>{children}</Text>
    </Pressable>
  );
}

// 약관·개인정보 수집 동의를 받기 전에는 서비스를 쓸 수 없는 화면
export default function ConsentScreen() {
  const router = useRouter();
  const uid = useUid();
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [age, setAge] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function agree() {
    if (!(terms && privacy && age) || busy) return;
    setBusy(true);
    setError("");
    const { error } = await supabase.rpc("accept_terms", { p_version: TERMS_VERSION });
    setBusy(false);
    if (error) return setError("동의를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
    await mutate(["terms", uid], TERMS_VERSION, { revalidate: false });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}>
        <Text style={s.title}>시작하기 전에 확인해 주세요</Text>
        <Text style={[T.muted, { marginTop: 8, lineHeight: 20, fontSize: 14 }]}>
          우리끼리 중고마켓은 회사와 무관한 임직원 사설 서비스예요. 아래 내용에 동의하셔야 사용할 수 있어요.
        </Text>
        <View style={{ gap: 8, marginTop: 24 }}>
          <Check checked={terms} onToggle={() => setTerms(!terms)}>
            <Text style={{ fontWeight: "700" }}>(필수)</Text> 이용약관에 동의합니다.{" "}
            <Text style={s.link} onPress={() => router.push("/terms")}>
              보기
            </Text>
          </Check>
          <Check checked={privacy} onToggle={() => setPrivacy(!privacy)}>
            <Text style={{ fontWeight: "700" }}>(필수)</Text> 개인정보 수집·이용에 동의합니다. (회사 이메일, 닉네임, 게시글·채팅 내용 등){" "}
            <Text style={s.link} onPress={() => router.push("/privacy")}>
              보기
            </Text>
          </Check>
          <Check checked={age} onToggle={() => setAge(!age)}>
            <Text style={{ fontWeight: "700" }}>(필수)</Text> 만 14세 이상이며, 회사의 사내 규정과 보안 정책을 지키겠습니다.
          </Check>
        </View>
        {error ? <Text style={s.error}>{error}</Text> : null}
        <PrimaryButton title="동의하고 시작하기" onPress={agree} busy={busy} disabled={!(terms && privacy && age)} style={{ marginTop: 20 }} />
        <Pressable onPress={() => supabase.auth.signOut()} style={{ paddingVertical: 14 }}>
          <Text style={[T.muted, { textAlign: "center" }]}>동의하지 않고 로그아웃</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "800", color: colors.ink },
  row: { flexDirection: "row", gap: 12, alignItems: "flex-start", padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.line, alignItems: "center", justifyContent: "center", marginTop: 1 },
  boxOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  tick: { color: "#fff", fontWeight: "800", fontSize: 14 },
  link: { color: colors.brandDark, fontWeight: "700", textDecorationLine: "underline" },
  error: { color: colors.danger, fontSize: 14, marginTop: 12 },
});
