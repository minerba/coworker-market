// 푸시 발송 함수 (웹 푸시 + 앱 푸시)
// - POST: DB 트리거가 새 알림마다 호출 (x-push-secret 헤더 필요). 해당 사용자의 모든 기기로 푸시 발송
//         웹 브라우저/PWA는 웹 푸시(VAPID), 안드로이드·iOS 앱은 FCM으로 발송.
//         FCM은 push_config의 fcm_service_account(Firebase 서비스 계정 JSON)가 설정된 경우에만 동작
// - GET : 브라우저가 구독할 때 쓰는 공개키 반환 (공개해도 되는 값). 키는 첫 호출 때 자동 생성되어 DB에 저장됨
// 비밀 키와 공유 비밀값은 public.push_config 테이블에만 있으며 코드/저장소에는 없음
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, x-push-secret, authorization, apikey",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const b64u = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function loadConfig(): Promise<Record<string, string>> {
  const { data, error } = await db.from("push_config").select("key,value");
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((r) => [r.key as string, r.value as string]));
}

// VAPID 키가 없으면 새로 만들어 저장 (동시에 여러 번 호출돼도 먼저 저장된 값이 유지됨)
async function ensureVapid() {
  let cfg = await loadConfig();
  if (cfg.vapid_public && cfg.vapid_private) return cfg;
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const pub = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  const jwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  await db
    .from("push_config")
    .upsert(
      [
        { key: "vapid_public", value: b64u(pub) },
        { key: "vapid_private", value: jwk.d as string },
      ],
      { onConflict: "key", ignoreDuplicates: true },
    );
  cfg = await loadConfig();
  return cfg;
}

// ---- FCM (앱 푸시) ----
const toB64u = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const strB64u = (str: string) => toB64u(new TextEncoder().encode(str));

type ServiceAccount = { project_id: string; client_email: string; private_key: string };
let fcmToken: { value: string; expires: number } | null = null;

// 서비스 계정으로 FCM 호출용 액세스 토큰을 발급받음 (1시간 캐시)
async function fcmAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (fcmToken && fcmToken.expires - 60 > now) return fcmToken.value;
  const header = strB64u(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = strB64u(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const pem = sa.private_key.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${header}.${claims}`));
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${header}.${claims}.${toB64u(sig)}` }),
  });
  if (!res.ok) throw new Error(`fcm oauth ${res.status}`);
  const { access_token, expires_in } = await res.json();
  fcmToken = { value: access_token, expires: now + (expires_in ?? 3600) };
  return access_token;
}

// 앱 기기(안드로이드/iOS)로 발송. 만료된 토큰은 정리. Firebase 설정이 없으면 건너뜀
async function sendNative(cfg: Record<string, string>, userId: string, title: string, body: string, link: string) {
  if (!cfg.fcm_service_account) return { sent: 0, removed: 0, skipped: true };
  const { data: tokens, error } = await db.from("native_push_tokens").select("id,token").eq("user_id", userId);
  if (error) throw error;
  if (!tokens || tokens.length === 0) return { sent: 0, removed: 0, skipped: false };
  const sa = JSON.parse(cfg.fcm_service_account) as ServiceAccount;
  const access = await fcmAccessToken(sa);
  let sent = 0;
  let removed = 0;
  await Promise.all(
    tokens.map(async (t) => {
      const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
        method: "POST",
        headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: {
            token: t.token,
            notification: { title, body },
            data: { link },
            android: { priority: "HIGH", notification: { tag: link } },
            apns: { payload: { aps: { sound: "default" } } },
          },
        }),
      });
      if (res.ok) sent++;
      else if (res.status === 404) {
        // 앱이 삭제되었거나 등록 해제된 토큰(UNREGISTERED)만 정리. 400은 요청 형식 오류일 수 있어 지우지 않음
        await db.from("native_push_tokens").delete().eq("id", t.id);
        removed++;
      } else console.error("fcm failed", res.status, (await res.text()).slice(0, 200));
    }),
  );
  return { sent, removed, skipped: false };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  try {
    const cfg = await ensureVapid();

    if (req.method === "GET") return json({ publicKey: cfg.vapid_public });
    if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

    if (!cfg.push_secret || req.headers.get("x-push-secret") !== cfg.push_secret) {
      return json({ error: "unauthorized" }, 401);
    }

    const { user_id, title, body, link } = await req.json();
    if (!user_id || !title) return json({ error: "bad request" }, 400);

    webpush.setVapidDetails(cfg.vapid_subject ?? "mailto:admin@example.com", cfg.vapid_public, cfg.vapid_private);

    const { data: subs, error } = await db.from("push_subscriptions").select("id,endpoint,p256dh,auth").eq("user_id", user_id);
    if (error) throw error;

    const payload = JSON.stringify({ title, body: body ?? "", link: link ?? "/", tag: link ?? "coworker-market" });
    let sent = 0;
    let removed = 0;
    await Promise.all(
      (subs ?? []).map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 60 * 60 * 24 });
          sent++;
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) {
            // 만료되었거나 해지된 구독은 정리
            await db.from("push_subscriptions").delete().eq("id", s.id);
            removed++;
          } else {
            console.error("push failed", code, String(e).slice(0, 200));
          }
        }
      }),
    );
    // 안드로이드/iOS 앱 기기
    let native = { sent: 0, removed: 0, skipped: true };
    try {
      native = await sendNative(cfg, user_id, title, body ?? "", link ?? "/");
    } catch (e) {
      console.error("native push error", String(e).slice(0, 200));
    }
    return json({ sent, removed, native });
  } catch (e) {
    console.error("send-push error", String(e).slice(0, 300));
    return json({ error: "internal error" }, 500);
  }
});
