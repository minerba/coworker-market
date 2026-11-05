"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { mutate as globalMutate } from "swr";
import PageHeader from "@/components/PageHeader";
import { REPORT_REASONS } from "@/components/ReportSheet";
import { useAuth } from "@/components/AuthProvider";
import { BUCKET, storagePathFromUrl, withThumbPaths } from "@/lib/image";
import { supabase } from "@/lib/supabase";
import { timeAgo } from "@/lib/items";

type Report = {
  id: number;
  item_id: number | null;
  reported_user_id: string | null;
  target_label: string;
  reason: string;
  detail: string;
  status: "open" | "resolved" | "dismissed";
  created_at: string;
  reporter: { nickname: string } | null;
};

const COLUMNS =
  "id, item_id, reported_user_id, target_label, reason, detail, status, created_at, reporter:profiles!reports_reporter_id_fkey(nickname)";

export default function AdminPage() {
  const { session } = useAuth();
  const [admin, setAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<"open" | "done">("open");
  const [reports, setReports] = useState<Report[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session) return;
    supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => setAdmin(!!data?.is_admin));
  }, [session]);

  const load = useCallback(async () => {
    const q = supabase.from("reports").select(COLUMNS).order("created_at", { ascending: false }).limit(100);
    const { data, error } = await (tab === "open" ? q.eq("status", "open") : q.neq("status", "open"));
    setError(error ? "신고 목록을 불러오지 못했어요." : "");
    setReports((data as unknown as Report[]) ?? []);
  }, [tab]);

  useEffect(() => {
    if (!admin) return;
    let cancelled = false;
    const q = supabase.from("reports").select(COLUMNS).order("created_at", { ascending: false }).limit(100);
    (tab === "open" ? q.eq("status", "open") : q.neq("status", "open")).then(({ data, error }) => {
      if (cancelled) return;
      setError(error ? "신고 목록을 불러오지 못했어요." : "");
      setReports((data as unknown as Report[]) ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [admin, tab]);

  async function setStatus(r: Report, status: "resolved" | "dismissed") {
    const { error } = await supabase.from("reports").update({ status }).eq("id", r.id);
    if (error) return setError("처리하지 못했어요. 잠시 후 다시 시도해 주세요.");
    load();
  }

  async function removeItem(r: Report) {
    if (!r.item_id || !confirm(`"${r.target_label}" 글을 삭제하고 처리 완료할까요? 되돌릴 수 없어요.`)) return;
    // 삭제하기 전에 사진 경로를 확보해 두었다가 글을 지운 뒤 사진 파일도 정리
    const { data: found } = await supabase.from("items").select("image_urls").eq("id", r.item_id).maybeSingle();
    const { error } = await supabase.from("items").delete().eq("id", r.item_id);
    if (error) return setError("글을 삭제하지 못했어요.");
    const paths = ((found?.image_urls as string[] | undefined) ?? []).map(storagePathFromUrl).filter((p): p is string => !!p);
    if (paths.length) await supabase.storage.from(BUCKET).remove(withThumbPaths(paths));
    globalMutate((key) => (Array.isArray(key) && (key[0] === "items" || key[0] === "item" || key[0] === "mine")) || (typeof key === "string" && key.startsWith("$inf$")));
    await setStatus(r, "resolved");
  }

  if (admin === null) return <div className="min-h-dvh" aria-busy="true" />;
  if (!admin)
    return (
      <>
        <PageHeader title="관리자" />
        <p className="py-20 text-center text-sm text-muted">관리자만 볼 수 있어요.</p>
      </>
    );

  const reasonLabel = (v: string) => REPORT_REASONS.find((x) => x.value === v)?.label ?? v;

  return (
    <>
      <PageHeader title="신고 처리" />
      <div className="mx-5 mb-3 grid grid-cols-2 gap-2">
        {(["open", "done"] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setReports(null);
              setTab(t);
            }}
            className={`rounded-xl py-2.5 text-sm font-semibold ring-1 ${
              tab === t ? "bg-ink text-white ring-ink" : "bg-card text-ink ring-line"
            }`}
          >
            {t === "open" ? "처리 대기" : "처리 완료"}
          </button>
        ))}
      </div>
      {error && <p className="px-5 pb-2 text-sm text-red-600">{error}</p>}
      <section className="space-y-3 px-5">
        {reports === null ? (
          [0, 1].map((i) => <div key={i} className="h-28 animate-pulse rounded-3xl bg-sand" />)
        ) : reports.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted">
            {tab === "open" ? "처리할 신고가 없어요." : "처리한 신고가 없어요."}
          </p>
        ) : (
          reports.map((r) => (
            <article key={r.id} className="rounded-3xl border border-line bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-brand-dark">
                  {reasonLabel(r.reason)}
                </span>
                <span className="text-xs text-muted">{timeAgo(r.created_at)}</span>
              </div>
              <p className="mt-2 font-semibold">
                {r.item_id ? "글" : "사용자"} · {r.target_label || "(삭제됨)"}
              </p>
              <p className="mt-0.5 text-xs text-muted">신고자 {r.reporter?.nickname ?? "알 수 없음"}</p>
              {r.detail && <p className="mt-2 text-sm leading-snug whitespace-pre-wrap">{r.detail}</p>}
              {r.status !== "open" ? (
                <p className="mt-3 text-sm font-semibold text-muted">{r.status === "resolved" ? "처리 완료" : "기각"}</p>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.item_id && (
                    <Link href={`/items/${r.item_id}`} className="rounded-xl bg-sand px-3 py-2 text-sm font-semibold">
                      글 보기
                    </Link>
                  )}
                  {r.item_id && (
                    <button onClick={() => removeItem(r)} className="rounded-xl bg-sand px-3 py-2 text-sm font-semibold text-red-600">
                      글 삭제
                    </button>
                  )}
                  <button onClick={() => setStatus(r, "resolved")} className="rounded-xl bg-ink px-3 py-2 text-sm font-semibold text-white">
                    처리 완료
                  </button>
                  <button onClick={() => setStatus(r, "dismissed")} className="rounded-xl bg-sand px-3 py-2 text-sm font-semibold">
                    기각
                  </button>
                </div>
              )}
            </article>
          ))
        )}
      </section>
    </>
  );
}
