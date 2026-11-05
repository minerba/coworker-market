import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Icon from "./Icon";
import { colors } from "@/lib/theme";

export type MenuAction = { label: string; onPress: () => void; danger?: boolean };

// 점 세 개 버튼을 누르면 아래에서 올라오는 메뉴
export default function MoreMenu({ actions, color = colors.ink }: { actions: MenuAction[]; color?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} hitSlop={12} accessibilityLabel="더보기" accessibilityRole="button" style={s.trigger}>
        <Icon name="more" size={22} color={color} strokeWidth={2.5} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setOpen(false)}>
          <View style={s.sheet}>
            {actions.map((a) => (
              <Pressable
                key={a.label}
                onPress={() => {
                  setOpen(false);
                  setTimeout(a.onPress, 150);
                }}
                style={({ pressed }) => [s.row, pressed && { backgroundColor: colors.sand }]}
              >
                <Text style={[s.rowText, a.danger && { color: colors.danger }]}>{a.label}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => setOpen(false)} style={[s.row, s.cancel]}>
              <Text style={s.rowText}>취소</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  trigger: { padding: 4 },
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.cream, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 8, paddingBottom: 24 },
  row: { paddingVertical: 16, paddingHorizontal: 24 },
  rowText: { fontSize: 16, fontWeight: "500", color: colors.ink },
  cancel: { borderTopWidth: 1, borderTopColor: colors.line, marginTop: 4 },
});
