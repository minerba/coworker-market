import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

export const BUCKET = "item-images";

// base64 → 업로드용 바이트
function toBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// 사진 한 장을 원본(긴 변 1080px)과 목록용 썸네일(360px)로 만든다. 다시 인코딩하므로 촬영 위치 등 부가 정보는 제거된다.
export async function processImage(uri: string): Promise<{ full: Uint8Array; thumb: Uint8Array }> {
  const render = async (width: number, quality: number) => {
    const r = await manipulateAsync(uri, [{ resize: { width } }], { compress: quality, format: SaveFormat.JPEG, base64: true });
    if (!r.base64) throw new Error("이미지를 처리하지 못했어요.");
    return toBytes(r.base64);
  };
  return { full: await render(1080, 0.8), thumb: await render(360, 0.72) };
}

// 공개 URL → 스토리지 경로 (삭제용)
export function storagePathFromUrl(url: string): string | null {
  const i = url.indexOf(`/${BUCKET}/`);
  return i === -1 ? null : decodeURIComponent(url.slice(i + BUCKET.length + 2));
}
export const thumbUrl = (url: string) => url.replace(/\.jpg$/, "_t.jpg");
export const withThumbPaths = (paths: string[]) => paths.flatMap((p) => [p, p.replace(/\.jpg$/, "_t.jpg")]);
