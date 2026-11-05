import { ScrollView, StyleSheet, Text, View } from "react-native";
import { colors } from "@/lib/theme";

export function LegalScreen({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView contentContainerStyle={s.wrap} style={{ backgroundColor: colors.cream }}>
      {children}
    </ScrollView>
  );
}
export const H = ({ children }: { children: React.ReactNode }) => <Text style={s.h}>{children}</Text>;
export const P = ({ children }: { children: React.ReactNode }) => <Text style={s.p}>{children}</Text>;
export const UL = ({ items }: { items: React.ReactNode[] }) => (
  <View style={{ gap: 6 }}>
    {items.map((t, i) => (
      <View key={i} style={{ flexDirection: "row", gap: 8 }}>
        <Text style={s.p}>•</Text>
        <Text style={[s.p, { flex: 1 }]}>{t}</Text>
      </View>
    ))}
  </View>
);
export const Notice = ({ children }: { children: React.ReactNode }) => (
  <View style={s.notice}>
    <Text style={s.noticeText}>{children}</Text>
  </View>
);

const s = StyleSheet.create({
  wrap: { padding: 20, paddingBottom: 48, gap: 14 },
  h: { fontSize: 16, fontWeight: "700", color: colors.ink, marginTop: 8 },
  p: { fontSize: 14, lineHeight: 22, color: colors.ink },
  notice: { backgroundColor: colors.brandSoft, borderRadius: 16, padding: 14 },
  noticeText: { fontSize: 13, lineHeight: 19, color: colors.brandDark },
});
