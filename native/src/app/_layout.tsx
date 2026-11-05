import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Stack, usePathname, useRouter, useSegments } from "expo-router";
import * as Notifications from "expo-notifications";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import useSWR from "swr";
import AuthProvider, { useAuth } from "@/providers/AuthProvider";
import NotificationProvider from "@/providers/NotificationProvider";
import SwrProvider from "@/providers/SwrProvider";
import { TERMS_VERSION } from "@/lib/legal";
import { activeRoute, configureNotifications } from "@/lib/push";
import { supabase } from "@/lib/supabase";
import { colors } from "@/lib/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});
configureNotifications();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SwrProvider>
        <AuthProvider>
          <NotificationProvider>
            <Gate />
          </NotificationProvider>
        </AuthProvider>
      </SwrProvider>
    </SafeAreaProvider>
  );
}

async function fetchTermsVersion() {
  const { data, error } = await supabase.rpc("my_terms_version");
  if (error) throw error;
  return (data as string | null) ?? "";
}

function Gate() {
  const { session, ready } = useAuth();
  const uid = session?.user.id;
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();
  const top = segments[0] as string | undefined;
  const isLogin = top === "login";
  const isConsent = top === "consent";
  const isLegal = top === "terms" || top === "privacy";
  const { data: version, error: versionError } = useSWR(uid ? ["terms", uid] : null, fetchTermsVersion);
  const waitingConsent = !!uid && version === undefined && !versionError;

  useEffect(() => {
    if (ready && !waitingConsent) SplashScreen.hideAsync().catch(() => {});
  }, [ready, waitingConsent]);

  // 로그인/동의 상태에 따라 화면 이동 (웹앱과 같은 규칙)
  useEffect(() => {
    if (!ready || waitingConsent) return;
    if (!session) {
      if (!isLogin && !isLegal) router.replace("/login");
    } else if (isLogin) {
      router.replace("/");
    } else if (version !== TERMS_VERSION && !isLegal && !isConsent) {
      router.replace("/consent");
    } else if (version === TERMS_VERSION && isConsent) {
      router.replace("/");
    }
  }, [ready, waitingConsent, session, version, isLogin, isLegal, isConsent, router]);

  // 지금 보고 있는 화면의 알림은 띄우지 않기 위해 현재 경로를 기록
  useEffect(() => {
    activeRoute.path = pathname;
  }, [pathname]);

  // 알림을 눌러 앱이 열리면 해당 화면으로 이동 (앱이 꺼져 있다가 열린 경우 포함)
  useEffect(() => {
    const open = (r: Notifications.NotificationResponse | null) => {
      const link = (r?.notification.request.content.data as { link?: string } | undefined)?.link;
      if (link && link.startsWith("/")) router.push(link);
    };
    open(Notifications.getLastNotificationResponse());
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, [router]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.cream },
          headerShadowVisible: false,
          headerTintColor: colors.ink,
          headerTitleStyle: { fontWeight: "700" },
          headerBackButtonDisplayMode: "minimal",
          contentStyle: { backgroundColor: colors.cream },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="consent" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="terms" options={{ title: "이용약관" }} />
        <Stack.Screen name="privacy" options={{ title: "개인정보 처리방침" }} />
        <Stack.Screen name="notifications" options={{ title: "알림" }} />
        <Stack.Screen name="admin" options={{ title: "신고 처리" }} />
        <Stack.Screen name="my-items" options={{ title: "내가 올린 글" }} />
        <Stack.Screen name="my-likes" options={{ title: "관심 목록" }} />
        <Stack.Screen name="items/[id]/index" options={{ title: "" }} />
        <Stack.Screen name="items/[id]/edit" options={{ title: "게시글 수정" }} />
        <Stack.Screen name="chat/[id]" options={{ title: "채팅" }} />
      </Stack>
      {(!ready || waitingConsent) && (
        <View style={s.splash} pointerEvents="none">
          <Text style={s.logo}>
            코워커<Text style={{ color: colors.brand }}>마켓</Text>
          </Text>
        </View>
      )}
    </>
  );
}

const s = StyleSheet.create({
  splash: { ...StyleSheet.absoluteFill, backgroundColor: colors.cream, alignItems: "center", justifyContent: "center" },
  logo: { fontSize: 28, fontWeight: "800", color: colors.ink },
});
