"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-2 px-6 text-center">
      <h1 className="text-lg font-bold">문제가 생겼어요</h1>
      <p className="text-sm text-muted">잠시 후 다시 시도해 주세요. 계속되면 앱을 새로고침해 주세요.</p>
      <button onClick={reset} className="mt-4 rounded-2xl bg-brand px-6 py-3 text-sm font-bold text-white">
        다시 시도
      </button>
    </div>
  );
}
