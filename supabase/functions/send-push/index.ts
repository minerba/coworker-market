// 웹 푸시 발송 함수
// - POST: DB 트리거가 새 알림마다 호출 (x-push-secret 헤더 필요). 해당 사용자의 모든 기기로 푸시 발송
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
    return json({ sent, removed });
  } catch (e) {
    console.error("send-push error", String(e).slice(0, 300));
    return json({ error: "internal error" }, 500);
  }
});
