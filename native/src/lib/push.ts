import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { supabase } from "./supabase";

const TOKEN_KEY = "cm_expo_push_token";

export type PushPermission = "granted" | "denied" | "default" | "unsupported";

// 지금 보고 있는 화면의 알림은 띄우지 않기 위한 현재 화면 경로
export const activeRoute = { path: "" };

export function configureNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async (n) => {
      const link = (n.request.content.data as { link?: string } | undefined)?.link;
      const sameScreen = !!link && link === activeRoute.path;
      return { shouldShowBanner: !sameScreen, shouldShowList: !sameScreen, shouldPlaySound: !sameScreen, shouldSetBadge: false };
    },
  });
}

export async function getPushPermission(): Promise<PushPermission> {
  if (!Device.isDevice) return "unsupported";
  const s = await Notifications.getPermissionsAsync();
  return s.status === "granted" ? "granted" : s.status === "denied" && !s.canAskAgain ? "denied" : "default";
}

// 푸시 알림 등록. prompt가 true면 권한을 묻고, false면 이미 허용된 경우에만 조용히 등록한다.
export async function registerForPush(prompt: boolean): Promise<{ permission: PushPermission; registered: boolean }> {
  if (!Device.isDevice) return { permission: "unsupported", registered: false };
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "알림",
      importance: Notifications.AndroidImportance.MAX,
      lightColor: "#f08a4b",
    });
  }
  let status = (await Notifications.getPermissionsAsync()).status;
  if (status !== "granted" && prompt) status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== "granted") return { permission: status === "denied" ? "denied" : "default", registered: false };

  try {
    let token: string;
    if (Platform.OS === "android") {
      // 안드로이드: Firebase(FCM) 토큰을 그대로 등록 (Expo 계정 불필요). google-services.json이 빌드에 포함돼 있어야 함
      token = (await Notifications.getDevicePushTokenAsync()).data as string;
    } else {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      if (!projectId) return { permission: "granted", registered: false }; // EAS 프로젝트 연결 전에는 토큰을 받을 수 없음
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    }
    const { error } = await supabase.rpc("register_native_push_token", { p_token: token, p_platform: Platform.OS });
    if (error) return { permission: "granted", registered: false };
    await AsyncStorage.setItem(TOKEN_KEY, token);
    return { permission: "granted", registered: true };
  } catch {
    return { permission: "granted", registered: false };
  }
}

// 로그아웃 전에 호출: 이 기기로 다른 사람의 알림이 가지 않도록 토큰을 해제
export async function unregisterPush() {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token) await supabase.from("native_push_tokens").delete().eq("token", token);
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch {
    /* 해제하지 못해도 로그아웃은 진행 */
  }
}
