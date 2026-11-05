import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Chip, Field, PrimaryButton, T } from "./ui";
import { colors } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

export const REPORT_REASONS = [
  { value: "spam", label: "광고·스팸" },
  { value: "fraud", label: "사기 의심" },
  { value: "prohibited", label: "금지 물품" },
  { value: "abuse", label: "욕설·비매너" },
  { value: "other", label: "기타" },
] as const;

export default function ReportSheet({
  visible,
  target,
  onClose,
}: {
  visible: boolean;
  target: { itemId?: number; userId?: string; label: string };
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);

  async function submit() {
    if (!reason || busy) return;
    setBusy(true);
    setMessage("");
    const row: Record<string, string | number | undefined> = {
      reason,
      detail: detail.trim(),
      ...(target.itemId ? { item_id: target.itemId } : { reported_user_id: target.userId }),
    };
    const { error } = await supabase.from("reports").insert(row);
    setBusy(false);
    if (error) return setMessage(error.code === "23505" ? "이미 신고하셨어요." : "신고하지 못했어요. 잠시 후 다시 시도해 주세요.");
    setDone(true);
  }

  function close() {
    onClose();
    setTimeout(() => {
      setDone(false);
      setReason("");
      setDetail("");
      setMessage("");
    }, 300);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <Pressable style={s.backdrop} onPress={close}>
          <Pressable style={s.sheet} onPress={() => {}}>
            {done ? (
              <View style={{ alignItems: "center", paddingVertical: 12, gap: 6 }}>
                <Text style={T.h1}>신고가 접수되었어요</Text>
                <Text style={T.muted}>운영자가 확인한 뒤 조치할게요.</Text>
                <PrimaryButton title="확인" onPress={close} style={{ alignSelf: "stretch", marginTop: 16 }} />
              </View>
            ) : (
              <>
                <Text style={T.h1}>신고하기</Text>
                <Text style={[T.muted, { marginTop: 2 }]} numberOfLines={1}>
                  {target.label}
                </Text>
                <View style={s.chips}>
                  {REPORT_REASONS.map((r) => (
                    <Chip key={r.value} label={r.label} active={reason === r.value} onPress={() => setReason(r.value)} />
                  ))}
                </View>
                <Field value={detail} onChangeText={setDetail} maxLength={500} multiline placeholder="자세한 내용을 적어주세요 (선택)" style={{ marginTop: 16 }} />
                {message ? <Text style={s.error}>{message}</Text> : null}
                <View style={s.actions}>
                  <PrimaryButton title="취소" tone="sand" onPress={close} style={{ flex: 1 }} />
                  <PrimaryButton title="신고하기" onPress={submit} disabled={!reason} busy={busy} style={{ flex: 1 }} />
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.cream, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
  actions: { flexDirection: "row", gap: 8, marginTop: 16 },
  error: { color: colors.danger, fontSize: 14, marginTop: 8 },
});
