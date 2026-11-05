// 업로드 전 사진 처리: 원본(긴 변 1080px)과 목록용 썸네일(긴 변 360px)을 함께 만든다.
async function resize(bitmap: ImageBitmap, maxSide: number, quality: number): Promise<Blob> {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
  if (!blob) throw new Error("이미지를 처리하지 못했어요.");
  return blob;
}

export async function processImage(file: File): Promise<{ full: Blob; thumb: Blob }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const full = await resize(bitmap, 1080, 0.8);
    const thumb = await resize(bitmap, 360, 0.72);
    return { full, thumb };
  } finally {
    bitmap.close();
  }
}

const BUCKET = "item-images";

// 공개 URL → 스토리지 경로 (삭제용)
export function storagePathFromUrl(url: string): string | null {
  const i = url.indexOf(`/${BUCKET}/`);
  return i === -1 ? null : decodeURIComponent(url.slice(i + BUCKET.length + 2));
}

// 원본 주소 → 썸네일 주소 (xxx.jpg → xxx_t.jpg). 썸네일이 없는 예전 사진은 화면에서 원본으로 대체
export const thumbUrl = (url: string) => url.replace(/\.jpg$/, "_t.jpg");

// 원본 경로 목록 → 원본 + 썸네일 경로 목록 (삭제용)
export const withThumbPaths = (paths: string[]) => paths.flatMap((p) => [p, p.replace(/\.jpg$/, "_t.jpg")]);

export { BUCKET };
