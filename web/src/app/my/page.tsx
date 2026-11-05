"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";

type Block = { blocked_id: string; profiles: { nickname: string } | null };

export default function MyPage() {
  const { session } = useAuth();
  const [nickname, setNickname] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState("");

  useEffect(() => {
    if (!session) return;
    supabase
      .from("profiles")
      .select("nickname, is_admin")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => {
        setNickname(data?.nickname ?? "");
        setIsAdmin(!!data?.is_admin);
      });
    supabase
      .from("user_blocks")
      .select("blocked_id, profiles!user_blocks_blocked_id_fkey(nickname)")
      .then(({ data }) => setBlocks((data as unknown as Block[]) ?? []));
  }, [session]);

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
    if (!error) setBlocks((prev) => prev.filter((b) => b.blocked_id !== id));
  }

  return (
    <div className="px-5 pt-8">
      <h1 className="text-xl font-extrabold">내 정보</h1>
      <div className="mt-5 rounded-3xl border border-line bg-card p-5">
        <p className="text-lg font-bold">{nickname || "..."}</p>
        <p className="mt-1 text-sm text-muted">{session?.user.email}</p>
      </div>

      {isAdmin && (
        <Link href="/admin" className="mt-3 block rounded-2xl bg-ink py-3.5 text-center text-sm font-semibold text-white">
          관리자 · 신고 처리
        </Link>
      )}

      <h2 className="mt-8 text-base font-bold">비밀번호</h2>
      <p className="mt-1 text-sm leading-snug text-muted">
        {session?.user.user_metadata?.has_password
          ? "설정되어 있어요. 아래에서 바꿀 수 있어요."
          : "설정하면 다른 기기에서도 인증 메일 없이 바로 로그인할 수 있어요."}
      </p>
      <form onSubmit={savePassword} className="mt-3 space-y-2">
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          autoComplete="new-password"
          placeholder="새 비밀번호 (8자 이상)"
          className="w-full rounded-2xl bg-card px-4 py-3.5 text-base outline-none ring-1 ring-line focus:ring-2 focus:ring-brand"
        />
        <input
          type="password"
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
          autoComplete="new-password"
          placeholder="새 비밀번호 확인"
          className="w-full rounded-2xl bg-card px-4 py-3.5 text-base outline-none ring-1 ring-line focus:ring-2 focus:ring-brand"
        />
        {pwMsg && <p className={`text-sm ${pwMsg.startsWith("비밀번호를 저장했어요") ? "text-sage" : "text-red-600"}`}>{pwMsg}</p>}
        <button disabled={pwBusy || !pw} className="w-full rounded-2xl bg-ink py-3.5 text-sm font-semibold text-white disabled:opacity-50">
          {pwBusy ? "저장 중..." : "비밀번호 저장"}
        </button>
      </form>

      <h2 className="mt-8 text-base font-bold">차단한 사용자</h2>
      {blocks.length === 0 ? (
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

      <button
        onClick={() => supabase.auth.signOut()}
        className="mt-8 w-full rounded-2xl bg-sand py-3.5 text-sm font-semibold text-ink"
      >
        로그아웃
      </button>
    </div>
  );
}
