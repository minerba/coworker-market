// 업로드 전 사진 압축: 긴 변 1280px, JPEG 0.82
export async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.82));
  if (!blob) throw new Error("이미지를 처리하지 못했어요.");
  return blob;
}

const BUCKET = "item-images";

// 공개 URL → 스토리지 경로 (삭제용)
export function storagePathFromUrl(url: string): string | null {
  const i = url.indexOf(`/${BUCKET}/`);
  return i === -1 ? null : decodeURIComponent(url.slice(i + BUCKET.length + 2));
}
export { BUCKET };
