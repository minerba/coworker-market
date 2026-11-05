"use client";

import { useState } from "react";
import { COMPANY_DOMAIN, supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [id, setId] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // 아이디만 입력하면 회사 도메인을 붙이고, 전체 주소를 입력하면 그대로 사용 (허용 여부는 DB가 최종 판단)
  const typed = id.trim().toLowerCase();
  const full = typed.includes("@");
  const email = full ? typed : `${typed}@${COMPANY_DOMAIN}`;

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!/^[a-z0-9._+-]+(@[a-z0-9.-]+\.[a-z]{2,})?$/.test(typed)) {
      setError("메일 주소를 확인해 주세요.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (error) {
      setError("인증 메일을 보내지 못했어요. 허용된 메일인지 확인하거나 잠시 후 다시 시도해 주세요.");
      return;
    }
    setStep("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: "email" });
    setBusy(false);
    if (error) setError("인증 코드가 맞지 않거나 만료됐어요.");
  }

  return (
    <div className="flex min-h-dvh flex-col justify-center px-6">
      <p className="text-sm text-muted">우리 회사 동료들과 함께</p>
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight">
        코워커<span className="text-brand">마켓</span>
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-muted">
        회사 메일로 인증하면 바로 시작할 수 있어요.
        <br />
        동료들끼리만 쓰는 안전한 공간이에요.
      </p>

      {step === "email" ? (
        <form onSubmit={sendCode} className="mt-8 space-y-3">
          <label className="block text-sm font-semibold">회사 메일</label>
          <div className="flex items-center rounded-2xl bg-card px-4 ring-1 ring-line focus-within:ring-2 focus-within:ring-brand">
            <input
              value={id}
              onChange={(e) => setId(e.target.value)}
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              placeholder="메일 아이디"
              className="min-w-0 flex-1 bg-transparent py-3.5 text-base outline-none placeholder:text-muted/60"
            />
            {!full && <span className="text-base text-muted">@{COMPANY_DOMAIN}</span>}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            disabled={busy || !id.trim()}
            className="w-full rounded-2xl bg-brand py-3.5 text-base font-bold text-white shadow-lg shadow-brand/30 transition active:scale-[0.99] disabled:opacity-50"
          >
            {busy ? "보내는 중..." : "인증 코드 받기"}
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="mt-8 space-y-3">
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
          <button
            disabled={busy || code.length < 6}
            className="w-full rounded-2xl bg-brand py-3.5 text-base font-bold text-white shadow-lg shadow-brand/30 disabled:opacity-50"
          >
            {busy ? "확인 중..." : "확인"}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setCode("");
              setError("");
            }}
            className="w-full py-2 text-sm text-muted"
          >
            메일 주소 다시 입력
          </button>
        </form>
      )}
    </div>
  );
}
