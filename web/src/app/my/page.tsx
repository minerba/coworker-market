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
