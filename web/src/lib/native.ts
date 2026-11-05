// 안드로이드/iOS 앱(Capacitor) 안에서 실행될 때만 쓰는 기기 기능 연결.
// 앱 안에서는 앱이 주입하는 window.Capacitor를 통해 접근하므로 웹 번들에 Capacitor를 포함하지 않는다.
import { supabase } from "./supabase";

type Listener = { remove: () => Promise<void> };
type PushPlugin = {
  checkPermissions: () => Promise<{ receive: string }>;
  requestPermissions: () => Promise<{ receive: string }>;
  register: () => Promise<void>;
  addListener: (event: string, cb: (data: never) => void) => Promise<Listener>;
};
type AppPlugin = {
  addListener: (event: string, cb: (data: { canGoBack?: boolean }) => void) => Promise<Listener>;
  exitApp: () => Promise<void>;
};
type StatusBarPlugin = { setStyle: (o: { style: string }) => Promise<void>; setBackgroundColor?: (o: { color: string }) => Promise<void> };
type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
  Plugins?: { PushNotifications?: PushPlugin; App?: AppPlugin; StatusBar?: StatusBarPlugin };
};

const cap = (): CapacitorGlobal | undefined =>
  typeof window === "undefined" ? undefined : (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;

export const isNative = () => cap()?.isNativePlatform?.() === true;
export const nativePlatform = (): "android" | "ios" | null => {
  const p = cap()?.getPlatform?.();
  return p === "android" || p === "ios" ? p : null;
};

export type NativePermission = "granted" | "denied" | "default" | "unsupported";
const toPermission = (v: string | undefined): NativePermission =>
  v === "granted" ? "granted" : v === "denied" ? "denied" : "default";

export async function nativePushPermission(): Promise<NativePermission> {
  const push = cap()?.Plugins?.PushNotifications;
  if (!push) return "unsupported";
  try {
    return toPermission((await push.checkPermissions()).receive);
  } catch {
    return "unsupported";
  }
}

let listenersAdded = false;

// 앱 푸시 등록. prompt가 true면 권한을 물어보고, false면 이미 허용된 경우에만 조용히 등록한다.
export async function enableNativePush(prompt: boolean): Promise<NativePermission> {
  const push = cap()?.Plugins?.PushNotifications;
  const platform = nativePlatform();
  if (!push || !platform) return "unsupported";
  try {
    let state = toPermission((await push.checkPermissions()).receive);
    if (state === "default" && prompt) state = toPermission((await push.requestPermissions()).receive);
    if (state !== "granted") return state;

    if (!listenersAdded) {
      listenersAdded = true;
      await push.addListener("registration", (async (t: { value: string }) => {
        await supabase.rpc("register_native_push_token", { p_token: t.value, p_platform: platform });
      }) as (d: never) => void);
      // 알림을 눌러 앱이 열리면 해당 화면으로 이동
      await push.addListener("pushNotificationActionPerformed", ((a: { notification?: { data?: { link?: string } } }) => {
        const link = a.notification?.data?.link;
        if (link && link.startsWith("/")) window.location.assign(link);
      }) as (d: never) => void);
    }
    await push.register();
    return "granted";
  } catch {
    return "unsupported";
  }
}

// 안드로이드 뒤로가기 버튼: 첫 화면이면 앱 종료, 아니면 이전 화면
export async function setupNativeShell() {
  const plugins = cap()?.Plugins;
  try {
    await plugins?.App?.addListener("backButton", () => {
      if (window.location.pathname === "/" || window.history.length <= 1) plugins?.App?.exitApp();
      else window.history.back();
    });
    await plugins?.StatusBar?.setStyle({ style: "LIGHT" });
  } catch {
    /* 기기 기능을 쓸 수 없어도 앱은 정상 동작 */
  }
}
