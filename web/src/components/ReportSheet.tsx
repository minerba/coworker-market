"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export const REPORT_REASONS = [
  { value: "spam", label: "광고·스팸" },
  { value: "fraud", label: "사기 의심" },
  { value: "prohibited", label: "금지 물품" },
  { value: "abuse", label: "욕설·비매너" },
  { value: "other", label: "기타" },
] as const;

export default function ReportSheet({
  target,
  onClose,
}: {
  target: { itemId?: number; userId?: string; label: string };
  onClose: () => void;
}) {
  const [reason, setReason] = useState<string>("");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);

  async function submit() {
    if (!reason || busy) return;
    setBusy(true);
    setMessage("");
    const row: Record<string, string | number | undefined> = {
      reason,
      detail: detail.trim(),
      ...(target.itemId ? { item_id: target.itemId } : { reported_user_id: target.userId }),
    };
    const { error } = await supabase.from("reports").insert(row);
    setBusy(false);
    if (error) {
      setMessage(error.code === "23505" ? "이미 신고하셨어요." : "신고하지 못했어요. 잠시 후 다시 시도해 주세요.");
      return;
    }
    setDone(true);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/40" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl bg-cream p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        {done ? (
          <div className="py-6 text-center">
            <p className="text-lg font-bold">신고가 접수되었어요</p>
            <p className="mt-1 text-sm text-muted">운영자가 확인한 뒤 조치할게요.</p>
            <button onClick={onClose} className="mt-5 w-full rounded-2xl bg-brand py-3.5 font-bold text-white">
              확인
            </button>
          </div>
        ) : (
          <>
            <p className="text-lg font-bold">신고하기</p>
            <p className="mt-0.5 truncate text-sm text-muted">{target.label}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setReason(r.value)}
                  className={`rounded-full px-4 py-2 text-sm font-medium ring-1 ${
                    reason === r.value ? "bg-ink text-white ring-ink" : "bg-card text-ink ring-line"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="자세한 내용을 적어주세요 (선택)"
              className="mt-4 w-full resize-none rounded-2xl bg-card px-4 py-3 text-base outline-none ring-1 ring-line focus:ring-2 focus:ring-brand"
            />
            {message && <p className="mt-2 text-sm text-red-600">{message}</p>}
            <div className="mt-4 flex gap-2">
              <button onClick={onClose} className="flex-1 rounded-2xl bg-sand py-3.5 font-semibold">
                취소
              </button>
              <button
                onClick={submit}
                disabled={!reason || busy}
                className="flex-1 rounded-2xl bg-brand py-3.5 font-bold text-white disabled:opacity-50"
              >
                {busy ? "접수 중..." : "신고하기"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
