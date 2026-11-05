import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from "react-native";
import { colors } from "@/lib/theme";

export function PrimaryButton({
  title,
  onPress,
  disabled,
  busy,
  tone = "brand",
  style,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  tone?: "brand" | "ink" | "sand" | "danger";
  style?: StyleProp<ViewStyle>;
}) {
  const bg = { brand: colors.brand, ink: colors.ink, sand: colors.sand, danger: colors.danger }[tone];
  const fg = tone === "sand" ? colors.ink : "#fff";
  const off = disabled || busy;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      style={({ pressed }) => [s.btn, { backgroundColor: bg, opacity: off ? 0.5 : pressed ? 0.85 : 1 }, style]}
    >
      {busy ? <ActivityIndicator color={fg} /> : <Text style={[s.btnText, { color: fg }]}>{title}</Text>}
    </Pressable>
  );
}

export function Field(props: TextInputProps) {
  return <TextInput placeholderTextColor="#b5a898" {...props} style={[s.field, props.multiline && { minHeight: 120, textAlignVertical: "top" }, props.style]} />;
}

export function Chip({ label, active, onPress, tone = "ink" }: { label: string; active?: boolean; onPress: () => void; tone?: "ink" | "sage" }) {
  const on = tone === "sage" ? colors.sage : colors.ink;
  return (
    <Pressable onPress={onPress} style={[s.chip, active ? { backgroundColor: on, borderColor: on } : null]} accessibilityRole="button">
      <Text style={[s.chipText, active ? { color: "#fff" } : null]}>{label}</Text>
    </Pressable>
  );
}

export function Empty({ title, sub }: { title: string; sub?: string }) {
  return (
    <View style={s.empty}>
      <Text style={s.emptyTitle}>{title}</Text>
      {sub ? <Text style={s.emptySub}>{sub}</Text> : null}
    </View>
  );
}

export function Skeleton({ height = 120 }: { height?: number }) {
  return <View style={{ height, borderRadius: 24, backgroundColor: colors.sand, marginBottom: 12 }} />;
}

export const T = {
  h1: { fontSize: 22, fontWeight: "800", color: colors.ink } as const,
  h2: { fontSize: 16, fontWeight: "700", color: colors.ink } as const,
  body: { fontSize: 15, color: colors.ink, lineHeight: 22 } as const,
  muted: { fontSize: 13, color: colors.muted } as const,
};

const s = StyleSheet.create({
  btn: { borderRadius: 16, paddingVertical: 14, alignItems: "center", justifyContent: "center", minHeight: 50 },
  btnText: { fontSize: 16, fontWeight: "700" },
  field: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 16,
    color: colors.ink,
  },
  chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
  chipText: { fontSize: 14, fontWeight: "500", color: colors.ink },
  empty: { paddingVertical: 64, alignItems: "center" },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: colors.ink },
  emptySub: { marginTop: 4, fontSize: 14, color: colors.muted },
});
