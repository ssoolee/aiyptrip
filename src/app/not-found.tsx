import Link from "next/link";
import MascotSpot from "@/components/MascotSpot";

// 어느 경로에도 걸리지 않은 주소와, 코드에서 부른 notFound()가 여기로 온다.
// 루트 레이아웃 안에서 열리므로 하단 내비는 그대로 보인다.
export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <MascotSpot expression="wow" size={72} className="mb-4" />
      <h1 className="mb-2 text-xl font-bold">어라, 길을 잘못 드셨나 봐요</h1>
      <p className="text-sm leading-relaxed text-[var(--color-muted)]">
        찾으시는 페이지가 없어요. 평안이와 처음부터 둘러볼까요?
      </p>
      <Link
        href="/"
        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-button)] bg-[var(--color-primary)] px-6 text-sm font-semibold text-white"
      >
        홈으로 가기
      </Link>
    </div>
  );
}
