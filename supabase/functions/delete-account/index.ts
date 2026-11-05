// 회원 탈퇴 함수
// 로그인한 사용자 본인의 계정만 삭제한다 (요청의 로그인 토큰으로 본인 확인).
// - 사진 저장소의 본인 폴더(원본+썸네일)를 모두 삭제
// - 계정을 삭제하면 프로필, 글, 채팅, 관심, 차단, 알림, 푸시 구독 등이 연쇄 삭제됨
import { createClient } from "npm:@supabase/supabase-js@2";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  try {
    const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data, error } = await admin.auth.getUser(jwt);
    if (error || !data.user) return json({ error: "unauthorized" }, 401);
    const uid = data.user.id;

    // 사진 파일 삭제 (폴더 구조: <user_id>/<파일>)
    let removed = 0;
    for (let page = 0; page < 20; page++) {
      const { data: files, error: listErr } = await admin.storage.from("item-images").list(uid, { limit: 500 });
      if (listErr) throw listErr;
      if (!files || files.length === 0) break;
      const { error: rmErr } = await admin.storage.from("item-images").remove(files.map((f) => `${uid}/${f.name}`));
      if (rmErr) throw rmErr;
      removed += files.length;
      if (files.length < 500) break;
    }

    const { error: delErr } = await admin.auth.admin.deleteUser(uid);
    if (delErr) throw delErr;
    return json({ ok: true, removedFiles: removed });
  } catch (e) {
    console.error("delete-account error", String(e).slice(0, 300));
    return json({ error: "internal error" }, 500);
  }
});
