import { useState } from "react";
import { Alert, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import useSWR, { mutate as globalMutate } from "swr";
import { Field, PrimaryButton, T } from "@/components/ui";
import { useAuth } from "@/providers/AuthProvider";
import { useNotifications } from "@/providers/NotificationProvider";
import { deleteMyAccount, exportMyData } from "@/lib/account";
import { unregisterPush } from "@/lib/push";
import { supabase } from "@/lib/supabase";
import { colors } from "@/lib/theme";

type Profile = { nickname: string; building: string | null };
type Blocked = { blocked_id: string; profiles: { nickname: string } | null };

function LinkRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.link, pressed && { backgroundColor: colors.sand }]}>
      <Text style={{ fontSize: 15, fontWeight: "500", color: colors.ink }}>{label}</Text>
      <Text style={{ color: colors.muted, fontSize: 18 }}>›</Text>
    </Pressable>
  );
}

export default function MyScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const uid = session?.user.id;
  const email = session?.user.email ?? "";
  const { permission, pushRegistered, requestPermission } = useNotifications();

  const { data: profile, mutate: mutateProfile } = useSWR(uid ? ["profile", uid] : null, async () => {
    const { data } = await supabase.from("profiles").select("nickname, building").eq("id", uid!).single();
    return data as Profile | null;
  });
  const { data: isAdmin } = useSWR(uid ? ["is-admin", uid] : null, async () => (await supabase.rpc("is_admin")).data === true);
  const { data: blocks, mutate: mutateBlocks } = useSWR(uid ? ["blocklist", uid] : null, async () => {
    const { data } = await supabase.from("user_blocks").select("blocked_id, profiles!user_blocks_blocked_id_fkey(nickname)");
    return (data as unknown as Blocked[]) ?? [];
  });

  // 프로필 수정
  const [nickname, setNickname] = useState<string | null>(null);
  const [building, setBuilding] = useState<string | null>(null);
  const [profileMsg, setProfileMsg] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);
  const nick = nickname ?? profile?.nickname ?? "";
  const bld = building ?? profile?.building ?? "";
  const usingMailId = !!profile && profile.nickname === email.split("@")[0];

  async function saveProfile() {
    setProfileMsg("");
    const n = nick.trim();
    if (n.length < 2 || n.length > 20) return setProfileMsg("닉네임은 2~20자로 정해 주세요.");
    setProfileBusy(true);
    const { error } = await supabase.from("profiles").update({ nickname: n, building: bld.trim() || null }).eq("id", uid!);
    setProfileBusy(false);
    if (error) return setProfileMsg("저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
    await mutateProfile();
    setNickname(null);
    setBuilding(null);
    setProfileMsg("저장했어요.");
    globalMutate((key) => Array.isArray(key) && ["items", "item", "rooms", "mine", "likes"].includes(key[0] as string));
  }

  // 비밀번호
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState("");

  async function savePassword() {
    setPwMsg("");
    if (pw.length < 8) return setPwMsg("비밀번호는 8자 이상으로 해주세요.");
    if (pw !== pw2) return setPwMsg("비밀번호가 서로 달라요.");
    setPwBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw, data: { has_password: true } });
    setPwBusy(false);
    if (error) return setPwMsg("비밀번호를 저장하지 못했어요. 더 복잡하게 하거나 잠시 후 다시 시도해 주세요.");
    setPw("");
    setPw2("");
    setPwMsg("비밀번호를 저장했어요. 다른 기기에서도 메일과 비밀번호로 로그인할 수 있어요.");
  }

  async function unblock(id: string) {
    const { error } = await supabase.from("user_blocks").delete().eq("blocked_id", id);
    if (error) return;
    mutateBlocks((cur) => cur?.filter((b) => b.blocked_id !== id), { revalidate: false });
    globalMutate((key) => Array.isArray(key) && key[0] === "blocks");
  }

  // 회원 탈퇴
  const [leaving, setLeaving] = useState(false);
  const [leaveText, setLeaveText] = useState("");
  const [leaveBusy, setLeaveBusy] = useState(false);
  const [leaveMsg, setLeaveMsg] = useState("");

  async function leave() {
    if (leaveText.trim() !== "탈퇴") return;
    setLeaveBusy(true);
    setLeaveMsg("");
    const ok = await deleteMyAccount();
    setLeaveBusy(false);
    if (!ok) return setLeaveMsg("탈퇴를 처리하지 못했어요. 잠시 후 다시 시도해 주세요.");
    router.replace("/login");
  }

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
          <Text style={T.h1}>내 정보</Text>

          <View style={s.card}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.ink }}>{profile?.nickname ?? "..."}</Text>
            <Text style={[T.muted, { marginTop: 4, fontSize: 14 }]}>{email}</Text>
            {profile?.building ? <Text style={[T.muted, { marginTop: 2, fontSize: 14 }]}>{profile.building}</Text> : null}
          </View>

          {isAdmin ? <PrimaryButton title="관리자 · 신고 처리" tone="ink" onPress={() => router.push("/admin")} style={{ marginTop: 12 }} /> : null}

          <View style={{ gap: 8, marginTop: 20 }}>
            <LinkRow label="내가 올린 글" onPress={() => router.push("/my-items")} />
            <LinkRow label="관심 목록" onPress={() => router.push("/my-likes")} />
          </View>

          <Text style={s.h2}>프로필</Text>
          {usingMailId && <Text style={s.warn}>지금 닉네임이 회사 메일 아이디와 같아요. 동료에게 그대로 보이니 원하는 이름으로 바꿔 보세요.</Text>}
          <View style={{ gap: 8, marginTop: 12 }}>
            <Field value={nick} onChangeText={setNickname} maxLength={20} placeholder="닉네임 (2~20자)" />
            <Field value={bld} onChangeText={setBuilding} maxLength={30} placeholder="근무지 (선택, 예: 수원 A동)" />
            {profileMsg ? <Text style={{ fontSize: 14, color: profileMsg === "저장했어요." ? colors.sage : colors.danger }}>{profileMsg}</Text> : null}
            <PrimaryButton title="프로필 저장" tone="ink" onPress={saveProfile} busy={profileBusy} disabled={!profile} />
          </View>

          <Text style={s.h2}>알림</Text>
          <View style={[s.card, { marginTop: 8 }]}>
            {permission === "granted" ? (
              <Text style={{ fontSize: 14, lineHeight: 21 }}>
                <Text style={{ fontWeight: "700", color: colors.sage }}>켜져 있어요.</Text>
                <Text style={{ color: colors.muted }}>
                  {pushRegistered ? " 앱을 닫아도 새 메시지와 관심 알림을 보내드려요." : " 이 기기의 푸시 등록은 아직 완료되지 않았어요. 앱을 다시 열어 주세요."}
                </Text>
              </Text>
            ) : permission === "denied" ? (
              <View style={{ gap: 10 }}>
                <Text style={[T.muted, { fontSize: 14, lineHeight: 20 }]}>알림이 차단되어 있어요. 휴대폰 설정에서 코워커마켓의 알림을 허용해 주세요.</Text>
                <PrimaryButton title="설정 열기" tone="sand" onPress={() => Linking.openSettings()} style={{ minHeight: 44, paddingVertical: 10 }} />
              </View>
            ) : permission === "unsupported" ? (
              <Text style={[T.muted, { fontSize: 14, lineHeight: 20 }]}>이 기기에서는 푸시 알림을 쓸 수 없어요. (에뮬레이터이거나 지원하지 않는 기기)</Text>
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Text style={[T.muted, { flex: 1, fontSize: 14, lineHeight: 20 }]}>새 메시지를 놓치지 않도록 알림을 켜 보세요.</Text>
                <PrimaryButton title="알림 켜기" onPress={requestPermission} style={{ paddingHorizontal: 18, minHeight: 44, paddingVertical: 10 }} />
              </View>
            )}
            <Text style={[T.muted, { fontSize: 12, marginTop: 8 }]}>알림은 이 기기에서만 켜져요. 다른 기기에서도 받으려면 그 기기에서 켜 주세요.</Text>
          </View>

          <Text style={s.h2}>비밀번호</Text>
          <Text style={[T.muted, { fontSize: 14, marginTop: 4, lineHeight: 20 }]}>
            {session?.user.user_metadata?.has_password ? "설정되어 있어요. 아래에서 바꿀 수 있어요." : "설정하면 다른 기기에서도 인증 메일 없이 바로 로그인할 수 있어요."}
          </Text>
          <View style={{ gap: 8, marginTop: 12 }}>
            <Field value={pw} onChangeText={setPw} secureTextEntry autoComplete="new-password" placeholder="새 비밀번호 (8자 이상)" />
            <Field value={pw2} onChangeText={setPw2} secureTextEntry autoComplete="new-password" placeholder="새 비밀번호 확인" />
            {pwMsg ? <Text style={{ fontSize: 14, color: pwMsg.startsWith("비밀번호를 저장했어요") ? colors.sage : colors.danger }}>{pwMsg}</Text> : null}
            <PrimaryButton title="비밀번호 저장" tone="ink" onPress={savePassword} busy={pwBusy} disabled={!pw} />
          </View>

          <Text style={s.h2}>개인정보</Text>
          <View style={{ gap: 8, marginTop: 8 }}>
            <LinkRow label="이용약관" onPress={() => router.push("/terms")} />
            <LinkRow label="개인정보 처리방침" onPress={() => router.push("/privacy")} />
            <LinkRow
              label="내 데이터 내려받기"
              onPress={async () => {
                const ok = await exportMyData(uid!, email);
                if (!ok) Alert.alert("내려받지 못했어요", "잠시 후 다시 시도해 주세요.");
              }}
            />
          </View>

          <Text style={s.h2}>차단한 사용자</Text>
          {!blocks || blocks.length === 0 ? (
            <Text style={[T.muted, { marginTop: 8, fontSize: 14 }]}>차단한 사용자가 없어요.</Text>
          ) : (
            <View style={{ gap: 8, marginTop: 8 }}>
              {blocks.map((b) => (
                <View key={b.blocked_id} style={s.blockRow}>
                  <Text style={{ fontWeight: "500", color: colors.ink }}>{b.profiles?.nickname ?? "알 수 없음"}</Text>
                  <Pressable onPress={() => unblock(b.blocked_id)} hitSlop={8}>
                    <Text style={{ color: colors.brandDark, fontWeight: "600", fontSize: 14 }}>차단 해제</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          <PrimaryButton
            title="로그아웃"
            tone="sand"
            onPress={async () => {
              await unregisterPush();
              await supabase.auth.signOut();
            }}
            style={{ marginTop: 32 }}
          />

          <View style={[s.card, { marginTop: 32 }]}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: colors.danger }}>회원 탈퇴</Text>
            {!leaving ? (
              <>
                <Text style={[T.muted, { fontSize: 14, marginTop: 4, lineHeight: 20 }]}>탈퇴하면 내 글, 사진, 채팅, 관심 목록이 모두 삭제되고 되돌릴 수 없어요. 상대방과 나눈 채팅방도 함께 사라져요.</Text>
                <PrimaryButton title="탈퇴하기" tone="sand" onPress={() => setLeaving(true)} style={{ marginTop: 12, minHeight: 44, paddingVertical: 10 }} />
              </>
            ) : (
              <View style={{ gap: 8, marginTop: 8 }}>
                <Text style={[T.muted, { fontSize: 14, lineHeight: 20 }]}>확인을 위해 아래 칸에 &apos;탈퇴&apos;라고 입력해 주세요.</Text>
                <Field value={leaveText} onChangeText={setLeaveText} placeholder="탈퇴" />
                {leaveMsg ? <Text style={{ color: colors.danger, fontSize: 14 }}>{leaveMsg}</Text> : null}
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <PrimaryButton
                    title="취소"
                    tone="sand"
                    onPress={() => {
                      setLeaving(false);
                      setLeaveText("");
                    }}
                    style={{ flex: 1, minHeight: 44, paddingVertical: 10 }}
                  />
                  <PrimaryButton title="영구 삭제" tone="danger" onPress={leave} busy={leaveBusy} disabled={leaveText.trim() !== "탈퇴"} style={{ flex: 1, minHeight: 44, paddingVertical: 10 }} />
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 24, padding: 16, marginTop: 16 },
  h2: { fontSize: 16, fontWeight: "700", color: colors.ink, marginTop: 32 },
  warn: { marginTop: 8, backgroundColor: colors.brandSoft, color: colors.brandDark, borderRadius: 12, padding: 12, fontSize: 14, lineHeight: 20, overflow: "hidden" },
  link: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 15 },
  blockRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
});
