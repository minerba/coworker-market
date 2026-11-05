import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Field, PrimaryButton, T } from "@/components/ui";
import { COMPANY_DOMAIN, supabase } from "@/lib/supabase";
import { colors } from "@/lib/theme";

type Mode = "password" | "code";
const MODE_KEY = "cm_login_mode";

export default function LoginScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("code");
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // 마지막에 비밀번호로 로그인한 기기는 비밀번호 탭이 기본
  useState(() => {
    AsyncStorage.getItem(MODE_KEY).then((m) => m === "password" && setMode("password"));
  });

  // 아이디만 입력하면 회사 도메인을 붙이고, 전체 주소를 입력하면 그대로 사용 (허용 여부는 서버가 최종 판단)
  const typed = id.trim().toLowerCase();
  const full = typed.includes("@");
  const email = full ? typed : `${typed}@${COMPANY_DOMAIN}`;
  const validId = /^[a-z0-9._+-]+(@[a-z0-9.-]+\.[a-z]{2,})?$/.test(typed);
  const typoFix = full
    ? typed.replace(/\.(con|cmo|vom|xom|cim)$/, ".com").replace(/@(gamil|gmial|gmai|gnail)\./, "@gmail.").replace(/@(naver\.(?!com$)[a-z]+|nvaer\.com)$/, "@naver.com")
    : "";
  const suggestion = full && typoFix !== typed ? typoFix : "";

  function switchMode(m: Mode) {
    setMode(m);
    setError("");
    setCodeSent(false);
    setCode("");
  }

  async function signInWithPassword() {
    setError("");
    if (!validId) return setError("메일 주소를 확인해 주세요.");
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setError(error.status === 400 ? "메일 또는 비밀번호가 맞지 않아요. 비밀번호를 설정하지 않았다면 '인증 코드' 로그인을 써 주세요." : "로그인하지 못했어요. 잠시 후 다시 시도해 주세요.");
      return;
    }
    AsyncStorage.setItem(MODE_KEY, "password").catch(() => {});
  }

  async function sendCode() {
    setError("");
    if (!validId) return setError("메일 주소를 확인해 주세요.");
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    setBusy(false);
    if (error) {
      setError(error.status === 429 ? "메일을 너무 자주 요청했어요. 잠시 후 다시 시도해 주세요." : "인증 메일을 보내지 못했어요. 허용된 메일인지 확인하거나 잠시 후 다시 시도해 주세요.");
      return;
    }
    setCodeSent(true);
  }

  async function verify() {
    setError("");
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: "email" });
    setBusy(false);
    if (error) setError("인증 코드가 맞지 않거나 만료됐어요. 가장 최근에 받은 코드를 입력해 주세요.");
  }

  const emailField = (
    <View style={{ gap: 8 }}>
      <Text style={s.label}>회사 메일</Text>
      <View style={s.emailRow}>
        <TextInput
          value={id}
          onChangeText={setId}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          placeholder="메일 아이디"
          placeholderTextColor="#b5a898"
          style={s.emailInput}
        />
        {!full && <Text style={s.suffix}>@{COMPANY_DOMAIN}</Text>}
      </View>
      {suggestion ? (
        <Text style={T.muted}>
          혹시{" "}
          <Text onPress={() => setId(suggestion)} style={s.suggest}>
            {suggestion}
          </Text>{" "}
          아닌가요?
        </Text>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <Text style={T.muted}>우리 회사 동료들과 함께</Text>
          <Text style={s.logo}>
            코워커<Text style={{ color: colors.brand }}>마켓</Text>
          </Text>
          <Text style={[T.body, { color: colors.muted, marginTop: 12 }]}>
            회사 메일로 인증하면 바로 시작할 수 있어요.{"\n"}동료들끼리만 쓰는 안전한 공간이에요.
          </Text>

          <View style={s.tabs}>
            {(["password", "code"] as const).map((m) => (
              <Pressable key={m} onPress={() => switchMode(m)} style={[s.tab, mode === m && s.tabOn]}>
                <Text style={[s.tabText, mode === m && { color: colors.ink }]}>{m === "password" ? "비밀번호" : "인증 코드"}</Text>
              </Pressable>
            ))}
          </View>

          <View style={{ gap: 12, marginTop: 20 }}>
            {mode === "password" ? (
              <>
                {emailField}
                <Field value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" placeholder="비밀번호" />
                {error ? <Text style={s.error}>{error}</Text> : null}
                <PrimaryButton title="로그인" onPress={signInWithPassword} busy={busy} disabled={!id.trim() || !password} />
                <Text style={[T.muted, { textAlign: "center", lineHeight: 19 }]}>
                  처음이거나 비밀번호가 없다면 위의 인증 코드로 로그인한 뒤,{"\n"}내 정보에서 비밀번호를 설정하세요.
                </Text>
              </>
            ) : !codeSent ? (
              <>
                {emailField}
                {error ? <Text style={s.error}>{error}</Text> : null}
                <PrimaryButton title="인증 코드 받기" onPress={sendCode} busy={busy} disabled={!id.trim()} />
              </>
            ) : (
              <>
                <Text style={T.muted}>
                  <Text style={{ fontWeight: "700", color: colors.ink }}>{email}</Text>로 보낸 코드를 입력해 주세요.
                </Text>
                <Field
                  value={code}
                  onChangeText={(v) => setCode(v.replace(/\D/g, ""))}
                  keyboardType="number-pad"
                  autoComplete="one-time-code"
                  maxLength={10}
                  placeholder="인증 코드"
                  style={{ textAlign: "center", fontSize: 24, letterSpacing: 6 }}
                />
                {error ? <Text style={s.error}>{error}</Text> : null}
                <PrimaryButton title="확인" onPress={verify} busy={busy} disabled={code.length < 6} />
                <Pressable
                  onPress={() => {
                    setCodeSent(false);
                    setCode("");
                    setError("");
                  }}
                >
                  <Text style={[T.muted, { textAlign: "center", paddingVertical: 8 }]}>메일 주소 다시 입력</Text>
                </Pressable>
              </>
            )}
          </View>

          <Text style={[T.muted, { textAlign: "center", marginTop: 32, lineHeight: 19 }]}>
            회사와 무관한 임직원 사설 서비스예요. 로그인하면{" "}
            <Text style={s.link} onPress={() => router.push("/terms")}>
              이용약관
            </Text>
            과{" "}
            <Text style={s.link} onPress={() => router.push("/privacy")}>
              개인정보 처리방침
            </Text>
            을 확인하게 돼요.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: "center", padding: 24 },
  logo: { fontSize: 34, fontWeight: "800", color: colors.ink, marginTop: 4 },
  tabs: { flexDirection: "row", backgroundColor: colors.sand, borderRadius: 16, padding: 4, marginTop: 28 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center" },
  tabOn: { backgroundColor: colors.card },
  tabText: { fontSize: 14, fontWeight: "600", color: colors.muted },
  label: { fontSize: 14, fontWeight: "600", color: colors.ink },
  emailRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 16, paddingHorizontal: 16 },
  emailInput: { flex: 1, paddingVertical: 13, fontSize: 16, color: colors.ink },
  suffix: { fontSize: 16, color: colors.muted },
  error: { color: colors.danger, fontSize: 14 },
  suggest: { color: colors.brandDark, fontWeight: "700", textDecorationLine: "underline" },
  link: { textDecorationLine: "underline" },
});
