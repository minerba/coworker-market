"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { mutate } from "swr";
import { BUCKET, processImage, storagePathFromUrl, withThumbPaths } from "@/lib/image";
import { CATEGORIES, type Category, type Item } from "@/lib/items";

const MAX_IMAGES = 5;
const invalidateItems = () =>
  mutate((key) => (Array.isArray(key) && (key[0] === "items" || key[0] === "item" || key[0] === "mine")) || (typeof key === "string" && key.startsWith("$inf$")));

type Photo = { key: string; url: string; file?: File }; // file 없으면 기존 사진

const MAX_PRICE = 100_000_000;

export default function ItemForm({ item }: { item?: Item }) {
  const router = useRouter();
  const { session } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<Photo[]>(
    (item?.image_urls ?? []).map((url) => ({ key: url, url })),
  );
  const [title, setTitle] = useState(item?.title ?? "");
  const [category, setCategory] = useState<Category | "">(item?.category ?? "");
  const [free, setFree] = useState(item ? item.price === 0 : false);
  const [price, setPrice] = useState(item && item.price > 0 ? String(item.price) : "");
  const [place, setPlace] = useState(item?.place ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = [...photos];
    for (const f of Array.from(list)) {
      if (next.length >= MAX_IMAGES) break;
      next.push({ key: crypto.randomUUID(), url: URL.createObjectURL(f), file: f });
    }
    setPhotos(next);
    if (fileRef.current) fileRef.current.value = "";
  }

  const priceNum = free ? 0 : Number(price.replace(/\D/g, "") || 0);
  const valid = title.trim().length > 0 && category !== "" && (free || (priceNum > 0 && priceNum <= MAX_PRICE));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || !session) return;
    setBusy(true);
    setError("");
    const uid = session.user.id;
    const uploaded: string[] = [];
    try {
      const urls: string[] = [];
      for (const p of photos) {
        if (!p.file) {
          urls.push(p.url);
          continue;
        }
        const { full, thumb } = await processImage(p.file);
        const base = `${uid}/${crypto.randomUUID()}`;
        const opts = { contentType: "image/jpeg", cacheControl: "31536000" };
        const up1 = await supabase.storage.from(BUCKET).upload(`${base}.jpg`, full, opts);
        if (up1.error) throw up1.error;
        uploaded.push(`${base}.jpg`);
        const up2 = await supabase.storage.from(BUCKET).upload(`${base}_t.jpg`, thumb, opts);
        if (up2.error) throw up2.error;
        uploaded.push(`${base}_t.jpg`);
        urls.push(supabase.storage.from(BUCKET).getPublicUrl(`${base}.jpg`).data.publicUrl);
      }

      const fields = {
        title: title.trim(),
        category,
        price: priceNum,
        place: place.trim(),
        description: description.trim(),
        image_urls: urls,
      };
      const res = item
        ? await supabase.from("items").update(fields).eq("id", item.id).select("id").single()
        : await supabase.from("items").insert(fields).select("id").single();
      if (res.error) throw res.error;

      // 수정 시 제거된 기존 사진 정리
      if (item) {
        const removed = item.image_urls
          .filter((u) => !urls.includes(u))
          .map(storagePathFromUrl)
          .filter((p): p is string => !!p);
        if (removed.length) await supabase.storage.from(BUCKET).remove(withThumbPaths(removed));
      }
      invalidateItems();
      router.replace(`/items/${res.data.id}`);
    } catch {
      // 글 저장에 실패하면 방금 올린 사진도 정리
      if (uploaded.length) await supabase.storage.from(BUCKET).remove(uploaded);
      setError("저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
      setBusy(false);
    }
  }

  const input =
    "w-full rounded-2xl bg-card px-4 py-3.5 text-base outline-none ring-1 ring-line placeholder:text-muted/60 focus:ring-2 focus:ring-brand";

  return (
    <form onSubmit={submit} className="space-y-6 px-5 pb-8">
      <div>
        <p className="mb-2 text-sm font-semibold">
          사진 <span className="font-normal text-muted">{photos.length}/{MAX_IMAGES}</span>
        </p>
        <div className="no-scrollbar flex gap-3 overflow-x-auto">
          {photos.length < MAX_IMAGES && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex h-24 w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl bg-sand text-muted ring-1 ring-line"
            >
              <Icon name="camera" className="h-6 w-6" />
              <span className="text-xs">사진 추가</span>
            </button>
          )}
          {photos.map((p, i) => (
            <div key={p.key} className="relative h-24 w-24 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="h-full w-full rounded-2xl object-cover ring-1 ring-line" />
              {i === 0 && (
                <span className="absolute bottom-1 left-1 rounded-full bg-ink/70 px-2 py-0.5 text-[10px] text-white">대표</span>
              )}
              <button
                type="button"
                aria-label="사진 삭제"
                onClick={() => setPhotos(photos.filter((x) => x.key !== p.key))}
                className="absolute -top-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-white"
              >
                <Icon name="close" className="h-3.5 w-3.5" strokeWidth={2.5} />
              </button>
            </div>
          ))}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold">제목</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder="물건 이름을 알려주세요" className={input} />
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold">카테고리</p>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-full px-4 py-2 text-sm font-medium ring-1 ${
                category === c ? "bg-ink text-white ring-ink" : "bg-card text-ink ring-line"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-semibold">가격</label>
          <button
            type="button"
            onClick={() => setFree(!free)}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ring-1 ${
              free ? "bg-sage text-white ring-sage" : "bg-card text-ink ring-line"
            }`}
          >
            <Icon name="gift" className="h-4 w-4" />
            나눔
          </button>
        </div>
        <div className="flex items-center rounded-2xl bg-card px-4 ring-1 ring-line focus-within:ring-2 focus-within:ring-brand">
          <input
            value={free ? "" : price}
            onChange={(e) => setPrice(e.target.value.replace(/\D/g, "").slice(0, 9))}
            disabled={free}
            inputMode="numeric"
            placeholder={free ? "무료로 나눔해요" : "0"}
            className="min-w-0 flex-1 bg-transparent py-3.5 text-base outline-none placeholder:text-muted/60 disabled:opacity-60"
          />
          {!free && <span className="text-base text-muted">원</span>}
        </div>
        {!free && priceNum > MAX_PRICE && <p className="mt-2 text-xs text-red-600">가격은 1억 원까지 입력할 수 있어요.</p>}
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold">거래 희망 장소</label>
        <input value={place} onChange={(e) => setPlace(e.target.value)} maxLength={40} placeholder="예) A동 1층 로비" className={input} />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold">설명</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
          rows={6}
          placeholder="사용 기간, 상태, 거래 가능한 시간 등을 적어주세요"
          className={`${input} resize-none`}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        disabled={!valid || busy}
        className="w-full rounded-2xl bg-brand py-3.5 text-base font-bold text-white shadow-lg shadow-brand/30 disabled:opacity-50"
      >
        {busy ? "저장 중..." : item ? "수정 완료" : "등록하기"}
      </button>
    </form>
  );
}
