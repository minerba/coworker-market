import { supabase } from "./supabase";

// 푸시 공개키는 서버 함수가 알려줌 (공개해도 되는 값)
const KEY_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-push`;

export const pushSupported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function fetchPublicKey(): Promise<string> {
  const res = await fetch(KEY_URL);
  if (!res.ok) throw new Error("push key unavailable");
  const { publicKey } = (await res.json()) as { publicKey: string };
  return publicKey;
}

// 이 기기를 푸시 대상으로 등록 (알림 권한이 허용된 상태에서 호출). 성공하면 true
export async function subscribePush(): Promise<boolean> {
  try {
    if (!pushSupported() || Notification.permission !== "granted") return false;
    const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
    await navigator.serviceWorker.ready;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(await fetchPublicKey()),
      });
    }
    const json = sub.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) return false;
    const { error } = await supabase.rpc("register_push_subscription", {
      p_endpoint: json.endpoint,
      p_p256dh: json.keys.p256dh,
      p_auth: json.keys.auth,
      p_user_agent: navigator.userAgent,
    });
    return !error;
  } catch {
    return false;
  }
}

// 로그아웃 전에 호출: 이 기기로 다른 사람의 알림이 가지 않도록 구독을 해제
export async function unsubscribePush(): Promise<void> {
  try {
    if (!pushSupported()) return;
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;
    await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
    await sub.unsubscribe();
  } catch {
    /* 해제하지 못해도 로그아웃은 진행 */
  }
}
