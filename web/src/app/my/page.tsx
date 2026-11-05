"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR, { mutate as globalMutate } from "swr";
import { useAuth } from "@/components/AuthProvider";
import InstallBanner from "@/components/InstallBanner";
import { useNotifications } from "@/components/NotificationProvider";
import { fetchBlockedIds } from "@/lib/queries";
import { supabase } from "@/lib/supabase";

type Profile = { nickname: string; building: string | null; is_admin: boolean };
type Blocked = { blocked_id: string; profiles: { nickname: string } | null };

const input =
  "w-full rounded-2xl bg-card px-4 py-3.5 text-base outline-none ring-1 ring-line focus:ring-2 focus:ring-brand";

export default function MyPage() {
  const { session } = useAuth();
  const uid = session?.user.id;
  const email = session?.user.email ?? "";
  const { permission, requestPermission } = useNotifications();

  const { data: profile, mutate: mutateProfile } = useSWR(uid ? ["profile", uid] : null, async () => {
    const { data } = await supabase.from("profiles").select("nickname, building, is_admin").eq("id", uid!).single();
    return data as Profile | null;
  });
  const { data: blocks, mutate: mutateBlocks } = useSWR(uid ? ["blocklist", uid] : null, async () => {
    const { data } = await supabase.from("user_blocks").select("blocked_id, profiles!user_blocks_blocked_id_fkey(nickname)");
    return (data as unknown as Blocked[]) ?? [];
  });

  // 프로필 수정
  const [nickname, setNickname] = useState<string | null>(null);
  const [building, setBuilding] = useState<string | null>(null);
  const [profileMsg, setProfileMsg] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);
  const nick = nickname ?? profile?.nickname ?? "";
  const bld = building ?? profile?.building ?? "";
  const usingMailId = !!profile && profile.nickname === email.split("@")[0];

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg("");
    const n = nick.trim();
    if (n.length < 2 || n.length > 20) return setProfileMsg("닉네임은 2~20자로 정해 주세요.");
    setProfileBusy(true);
    const { error } = await supabase.from("profiles").update({ nickname: n, building: bld.trim() || null }).eq("id", uid!);
    setProfileBusy(false);
    if (error) return setProfileMsg("저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
    await mutateProfile();
    setNickname(null);
    setBuilding(null);
    setProfileMsg("저장했어요.");
    // 닉네임이 보이는 목록들도 새로 받도록
    globalMutate((key) => Array.isArray(key) && ["items", "item", "rooms", "mine", "likes"].includes(key[0] as string));
  }

  // 비밀번호
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState("");

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg("");
    if (pw.length < 8) return setPwMsg("비밀번호는 8자 이상으로 해주세요.");
    if (pw !== pw2) return setPwMsg("비밀번호가 서로 달라요.");
    setPwBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw, data: { has_password: true } });
    setPwBusy(false);
    if (error) return setPwMsg("비밀번호를 저장하지 못했어요. 더 복잡하게 하거나 잠시 후 다시 시도해 주세요.");
    try {
      localStorage.setItem("cm_login_mode", "password");
    } catch {
      /* 무시 */
    }
    setPw("");
    setPw2("");
    setPwMsg("비밀번호를 저장했어요. 다른 기기에서도 메일과 비밀번호로 로그인할 수 있어요.");
  }

  async function unblock(id: string) {
    const { error } = await supabase.from("user_blocks").delete().eq("blocked_id", id);
    if (error) return;
    mutateBlocks((cur) => cur?.filter((b) => b.blocked_id !== id), { revalidate: false });
    globalMutate((key) => Array.isArray(key) && key[0] === "blocks");
    fetchBlockedIds();
  }

  const row = "flex items-center justify-between rounded-2xl border border-line bg-card px-4 py-3.5 font-medium active:bg-sand";

  return (
    <div className="px-5 pt-8 pb-4">
      <h1 className="text-xl font-extrabold">내 정보</h1>
      <div className="mt-5 rounded-3xl border border-line bg-card p-5">
        <p className="text-lg font-bold">{profile?.nickname ?? "..."}</p>
        <p className="mt-1 text-sm text-muted">{email}</p>
        {profile?.building && <p className="mt-1 text-sm text-muted">{profile.building}</p>}
      </div>

      {profile?.is_admin && (
        <Link href="/admin" className="mt-3 block rounded-2xl bg-ink py-3.5 text-center text-sm font-semibold text-white">
          관리자 · 신고 처리
        </Link>
      )}

      <div className="mt-5 space-y-2">
        <Link href="/my/items" className={row}>
          내가 올린 글 <span className="text-muted">›</span>
        </Link>
        <Link href="/my/likes" className={row}>
          관심 목록 <span className="text-muted">›</span>
        </Link>
      </div>

      <h2 className="mt-8 text-base font-bold">프로필</h2>
      {usingMailId && (
        <p className="mt-1 rounded-xl bg-brand-soft px-3 py-2 text-sm leading-snug text-brand-dark">
          지금 닉네임이 회사 메일 아이디와 같아요. 동료에게 그대로 보이니 원하는 이름으로 바꿔 보세요.
        </p>
      )}
      <form onSubmit={saveProfile} className="mt-3 space-y-2">
        <input value={nick} onChange={(e) => setNickname(e.target.value)} maxLength={20} placeholder="닉네임 (2~20자)" className={input} />
        <input value={bld} onChange={(e) => setBuilding(e.target.value)} maxLength={30} placeholder="근무지 (선택, 예: 수원 A동)" className={input} />
        {profileMsg && <p className={`text-sm ${profileMsg === "저장했어요." ? "text-sage" : "text-red-600"}`}>{profileMsg}</p>}
        <button disabled={profileBusy || !profile} className="w-full rounded-2xl bg-ink py-3.5 text-sm font-semibold text-white disabled:opacity-50">
          {profileBusy ? "저장 중..." : "프로필 저장"}
        </button>
      </form>

      <h2 className="mt-8 text-base font-bold">알림</h2>
      <div className="mt-2 rounded-2xl border border-line bg-card p-4">
        {permission === "granted" ? (
          <p className="text-sm">
            <span className="font-semibold text-sage">켜져 있어요.</span>
            <span className="text-muted"> 앱이 백그라운드에 있어도 새 메시지를 알려드려요.</span>
          </p>
        ) : permission === "denied" ? (
          <p className="text-sm leading-snug text-muted">알림이 차단되어 있어요. 브라우저(또는 휴대폰) 설정에서 이 사이트의 알림을 허용해 주세요.</p>
        ) : permission === "unsupported" ? (
          <p className="text-sm leading-snug text-muted">
            이 브라우저는 알림을 지원하지 않아요. iPhone은 홈 화면에 추가한 앱에서만 알림을 켤 수 있어요.
          </p>
        ) : (
          <div className="flex items-center gap-3">
            <p className="flex-1 text-sm leading-snug text-muted">새 메시지를 놓치지 않도록 알림을 켜 보세요.</p>
            <button onClick={requestPermission} className="shrink-0 rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white">
              알림 켜기
            </button>
          </div>
        )}
        <p className="mt-2 text-xs leading-snug text-muted/80">앱을 완전히 닫은 상태의 알림(푸시)은 아직 지원하지 않아요.</p>
      </div>

      <div className="mt-4 empty:hidden">
        <InstallBanner dismissible={false} />
      </div>

      <h2 className="mt-8 text-base font-bold">비밀번호</h2>
      <p className="mt-1 text-sm leading-snug text-muted">
        {session?.user.user_metadata?.has_password
          ? "설정되어 있어요. 아래에서 바꿀 수 있어요."
          : "설정하면 다른 기기에서도 인증 메일 없이 바로 로그인할 수 있어요."}
      </p>
      <form onSubmit={savePassword} className="mt-3 space-y-2">
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" placeholder="새 비밀번호 (8자 이상)" className={input} />
        <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" placeholder="새 비밀번호 확인" className={input} />
        {pwMsg && <p className={`text-sm ${pwMsg.startsWith("비밀번호를 저장했어요") ? "text-sage" : "text-red-600"}`}>{pwMsg}</p>}
        <button disabled={pwBusy || !pw} className="w-full rounded-2xl bg-ink py-3.5 text-sm font-semibold text-white disabled:opacity-50">
          {pwBusy ? "저장 중..." : "비밀번호 저장"}
        </button>
      </form>

      <h2 className="mt-8 text-base font-bold">차단한 사용자</h2>
      {!blocks || blocks.length === 0 ? (
        <p className="mt-2 text-sm text-muted">차단한 사용자가 없어요.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {blocks.map((b) => (
            <li key={b.blocked_id} className="flex items-center justify-between rounded-2xl border border-line bg-card px-4 py-3">
              <span className="font-medium">{b.profiles?.nickname ?? "알 수 없음"}</span>
              <button onClick={() => unblock(b.blocked_id)} className="text-sm font-semibold text-brand-dark">
                차단 해제
              </button>
            </li>
          ))}
        </ul>
      )}

      <button onClick={() => supabase.auth.signOut()} className="mt-8 w-full rounded-2xl bg-sand py-3.5 text-sm font-semibold text-ink">
        로그아웃
      </button>
    </div>
  );
}
