import { Pressable, StyleSheet, View } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon, { type IconName } from "@/components/Icon";
import { useNotifications } from "@/providers/NotificationProvider";
import { colors } from "@/lib/theme";

const tabIcon = (name: IconName) => ({ color }: { color: unknown }) => <Icon name={name} color={color as string} size={24} />;

export default function TabsLayout() {
  const { unread } = useNotifications();
  const insets = useSafeAreaInsets();
  const chatUnread = unread.filter((n) => n.type === "message").length;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.line, height: 58 + insets.bottom, paddingTop: 6 },
        sceneStyle: { backgroundColor: colors.cream },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "홈", tabBarIcon: tabIcon("home") }} />
      <Tabs.Screen name="search" options={{ title: "탐색", tabBarIcon: tabIcon("search") }} />
      <Tabs.Screen
        name="sell"
        options={{
          title: "등록",
          tabBarButton: ({ onPress }) => (
            <View style={s.sellWrap}>
              <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="물건 등록" style={({ pressed }) => [s.sell, pressed && { opacity: 0.85 }]}>
                <Icon name="plus" color="#fff" size={26} strokeWidth={2.25} />
              </Pressable>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "채팅",
          tabBarIcon: tabIcon("chat"),
          tabBarBadge: chatUnread > 0 ? (chatUnread > 9 ? "9+" : chatUnread) : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.brand, color: "#fff", fontSize: 10 },
        }}
      />
      <Tabs.Screen name="my" options={{ title: "내 정보", tabBarIcon: tabIcon("user") }} />
    </Tabs>
  );
}

const s = StyleSheet.create({
  sellWrap: { flex: 1, alignItems: "center" },
  sell: {
    marginTop: -16,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.brand,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
