"use client";

import { useState } from "react";
import Link from "next/link";
import { COMPANY_DOMAIN, supabase } from "@/lib/supabase";

type Mode = "password" | "code";
const MODE_KEY = "cm_login_mode";

function readMode(): Mode {
  try {
    return localStorage.getItem(MODE_KEY) === "password" ? "password" : "code";
  } catch {
    return "code";
  }
}
function saveMode(m: Mode) {
  try {
    localStorage.setItem(MODE_KEY, m);
  } catch {
    /* 저장 불가 환경(시크릿 모드 등)은 무시 */
  }
}

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>(readMode);
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // 아이디만 입력하면 회사 도메인을 붙이고, 전체 주소를 입력하면 그대로 사용 (허용 여부는 DB가 최종 판단)
  const typed = id.trim().toLowerCase();
  const full = typed.includes("@");
  const email = full ? typed : `${typed}@${COMPANY_DOMAIN}`;
  const validId = /^[a-z0-9._+-]+(@[a-z0-9.-]+\.[a-z]{2,})?$/.test(typed);
  // 흔한 오타(.con, .cmo, gamil 등)를 알려주고 한 번에 고칠 수 있게 함
  const typoFix = full
    ? typed.replace(/\.(con|cmo|vom|xom|cim)$/, ".com").replace(/@(gamil|gmial|gmai|gnail)\./, "@gmail.").replace(/@(naver\.(?!com$)[a-z]+|nvaer\.com)$/, "@naver.com")
    : "";
  const suggestion = full && typoFix !== typed ? typoFix : "";

  function switchMode(m: Mode) {
    setMode(m);
    setError("");
    setCodeSent(false);
    setCode("");
  }

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!validId) return setError("메일 주소를 확인해 주세요.");
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setError(
        error.status === 400
          ? "메일 또는 비밀번호가 맞지 않아요. 비밀번호를 설정하지 않았다면 '인증 코드' 로그인을 써 주세요."
          : "로그인하지 못했어요. 잠시 후 다시 시도해 주세요.",
      );
      return;
    }
    saveMode("password");
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!validId) return setError("메일 주소를 확인해 주세요.");
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    setBusy(false);
    if (error) {
      setError(
        error.status === 429
          ? "메일을 너무 자주 요청했어요. 잠시 후 다시 시도해 주세요."
          : "인증 메일을 보내지 못했어요. 허용된 메일인지 확인하거나 잠시 후 다시 시도해 주세요.",
      );
      return;
    }
    setCodeSent(true);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: "email" });
    setBusy(false);
    if (error) setError("인증 코드가 맞지 않거나 만료됐어요. 가장 최근에 받은 코드를 입력해 주세요.");
  }

  const field =
    "flex items-center rounded-2xl bg-card px-4 ring-1 ring-line focus-within:ring-2 focus-within:ring-brand";
  const primary =
    "w-full rounded-2xl bg-brand py-3.5 text-base font-bold text-white shadow-lg shadow-brand/30 transition active:scale-[0.99] disabled:opacity-50";

  const emailField = (
    <>
      <label className="block text-sm font-semibold">회사 메일</label>
      <div className={field}>
        <input
          value={id}
          onChange={(e) => setId(e.target.value)}
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          placeholder="메일 아이디"
          className="min-w-0 flex-1 bg-transparent py-3.5 text-base outline-none placeholder:text-muted/60"
        />
        {!full && <span className="text-base text-muted">@{COMPANY_DOMAIN}</span>}
      </div>
      {suggestion && (
        <p className="text-sm text-muted">
          혹시{" "}
          <button type="button" onClick={() => setId(suggestion)} className="font-semibold text-brand-dark underline">
            {suggestion}
          </button>{" "}
          아닌가요?
        </p>
      )}
    </>
  );

  return (
    <div className="flex min-h-dvh flex-col justify-center px-6">
      <p className="text-sm text-muted">우리 회사 동료들과 함께</p>
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight">
        우리<span className="text-brand">끼리</span>
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-muted">
        회사 메일로 인증하면 바로 시작할 수 있어요.
        <br />
        동료들끼리만 쓰는 안전한 공간이에요.
      </p>

      <div className="mt-7 grid grid-cols-2 gap-1 rounded-2xl bg-sand p-1">
        {(["password", "code"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => switchMode(m)}
            className={`rounded-xl py-2.5 text-sm font-semibold ${mode === m ? "bg-card shadow-sm" : "text-muted"}`}
          >
            {m === "password" ? "비밀번호" : "인증 코드"}
          </button>
        ))}
      </div>

      {mode === "password" ? (
        <form onSubmit={signInWithPassword} className="mt-5 space-y-3">
          {emailField}
          <div className={field}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="비밀번호"
              className="min-w-0 flex-1 bg-transparent py-3.5 text-base outline-none placeholder:text-muted/60"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button disabled={busy || !id.trim() || !password} className={primary}>
            {busy ? "로그인 중..." : "로그인"}
          </button>
          <p className="text-center text-xs leading-relaxed text-muted">
            처음이거나 비밀번호가 없다면 위의 <b>인증 코드</b>로 로그인한 뒤,
            <br />
            내 정보에서 비밀번호를 설정하세요.
          </p>
        </form>
      ) : !codeSent ? (
        <form onSubmit={sendCode} className="mt-5 space-y-3">
          {emailField}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button disabled={busy || !id.trim()} className={primary}>
            {busy ? "보내는 중..." : "인증 코드 받기"}
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="mt-5 space-y-3">
          <p className="text-sm text-muted">
            <span className="font-semibold text-ink">{email}</span>로 보낸 코드를 입력해 주세요.
          </p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={10}
            placeholder="인증 코드"
            className="w-full rounded-2xl bg-card px-4 py-3.5 text-center text-2xl tracking-[0.35em] outline-none ring-1 ring-line focus:ring-2 focus:ring-brand"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button disabled={busy || code.length < 6} className={primary}>
            {busy ? "확인 중..." : "확인"}
          </button>
          <button
            type="button"
            onClick={() => {
              setCodeSent(false);
              setCode("");
              setError("");
            }}
            className="w-full py-2 text-sm text-muted"
          >
            메일 주소 다시 입력
          </button>
        </form>
      )}
      <p className="mt-8 text-center text-xs leading-relaxed text-muted">
        회사와 무관한 임직원 사설 서비스예요. 로그인하면{" "}
        <Link href="/terms" className="underline">
          이용약관
        </Link>
        과{" "}
        <Link href="/privacy" className="underline">
          개인정보 처리방침
        </Link>
        을 확인하게 돼요.
      </p>
    </div>
  );
}
