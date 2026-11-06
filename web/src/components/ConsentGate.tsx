"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import { useAuth } from "@/components/AuthProvider";
import { PUBLIC_PATHS, TERMS_VERSION } from "@/lib/legal";
import { supabase } from "@/lib/supabase";

// 약관·개인정보 수집 동의를 받기 전에는 서비스를 쓸 수 없게 하는 화면
export default function ConsentGate({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const pathname = usePathname();
  const uid = session?.user.id;
  const { data: version, isLoading, mutate } = useSWR(uid ? ["terms", uid] : null, async () => {
    const { data, error } = await supabase.rpc("my_terms_version");
    if (error) throw error;
    return (data as string | null) ?? "";
  });
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [age, setAge] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!uid || PUBLIC_PATHS.includes(pathname)) return <>{children}</>;
  if (isLoading || version === undefined) {
    return (
      <div className="flex min-h-dvh items-center justify-center" aria-busy="true">
        <span className="text-2xl font-extrabold tracking-tight">
          우리<span className="text-brand">끼리</span>
        </span>
      </div>
    );
  }
  if (version === TERMS_VERSION) return <>{children}</>;

  const all = terms && privacy && age;
  async function agree() {
    if (!all || busy) return;
    setBusy(true);
    setError("");
    const { error } = await supabase.rpc("accept_terms", { p_version: TERMS_VERSION });
    setBusy(false);
    if (error) return setError("동의를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
    await mutate(TERMS_VERSION, { revalidate: false });
  }

  const row = "flex items-start gap-3 rounded-2xl border border-line bg-card p-4";
  const box = "mt-0.5 h-5 w-5 shrink-0 accent-[#f08a4b]";

  return (
    <div className="flex min-h-dvh flex-col justify-center px-6 py-10">
      <h1 className="text-2xl font-extrabold tracking-tight">시작하기 전에 확인해 주세요</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        우리끼리는 회사와 무관한 임직원 사설 서비스예요. 아래 내용에 동의하셔야 사용할 수 있어요.
      </p>

      <div className="mt-6 space-y-2">
        <label className={row}>
          <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className={box} />
          <span className="text-sm leading-snug">
            <b>(필수)</b> 이용약관에 동의합니다.{" "}
            <Link href="/terms" className="font-semibold text-brand-dark underline">
              보기
            </Link>
          </span>
        </label>
        <label className={row}>
          <input type="checkbox" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} className={box} />
          <span className="text-sm leading-snug">
            <b>(필수)</b> 개인정보 수집·이용에 동의합니다. (회사 이메일, 닉네임, 게시글·채팅 내용 등){" "}
            <Link href="/privacy" className="font-semibold text-brand-dark underline">
              보기
            </Link>
          </span>
        </label>
        <label className={row}>
          <input type="checkbox" checked={age} onChange={(e) => setAge(e.target.checked)} className={box} />
          <span className="text-sm leading-snug">
            <b>(필수)</b> 만 14세 이상이며, 회사의 사내 규정과 보안 정책을 지키겠습니다.
          </span>
        </label>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <button
        onClick={agree}
        disabled={!all || busy}
        className="mt-5 w-full rounded-2xl bg-brand py-3.5 text-base font-bold text-white shadow-lg shadow-brand/30 disabled:opacity-50"
      >
        {busy ? "저장 중..." : "동의하고 시작하기"}
      </button>
      <button onClick={() => supabase.auth.signOut()} className="mt-2 w-full py-2 text-sm text-muted">
        동의하지 않고 로그아웃
      </button>
    </div>
  );
}
