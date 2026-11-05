import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-2 px-6 text-center">
      <h1 className="text-lg font-bold">페이지를 찾을 수 없어요</h1>
      <p className="text-sm text-muted">주소가 바뀌었거나 삭제된 페이지예요.</p>
      <Link href="/" className="mt-4 rounded-2xl bg-brand px-6 py-3 text-sm font-bold text-white">
        홈으로 가기
      </Link>
    </div>
  );
}
