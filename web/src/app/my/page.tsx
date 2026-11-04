"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";

export default function MyPage() {
  const { session } = useAuth();
  const [nickname, setNickname] = useState("");

  useEffect(() => {
    if (!session) return;
    supabase
      .from("profiles")
      .select("nickname")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => setNickname(data?.nickname ?? ""));
  }, [session]);

  return (
    <div className="px-5 pt-8">
      <h1 className="text-xl font-extrabold">내 정보</h1>
      <div className="mt-5 rounded-3xl border border-line bg-card p-5">
        <p className="text-lg font-bold">{nickname || "..."}</p>
        <p className="mt-1 text-sm text-muted">{session?.user.email}</p>
      </div>
      <button
        onClick={() => supabase.auth.signOut()}
        className="mt-4 w-full rounded-2xl bg-sand py-3.5 text-sm font-semibold text-ink"
      >
        로그아웃
      </button>
    </div>
  );
}
