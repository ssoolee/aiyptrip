"use client";

import Link from "next/link";
import MascotSpot from "@/components/MascotSpot";

// 코스를 만드는 길(LLM·외부 API)에서 난 오류만 여기서 받는다. 다시 시도하면
// retry()가 서버 컴포넌트를 다시 돌려 새 코스를 만든다.
export default function CourseError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <MascotSpot expression="wow" size={72} className="mb-4" />
      <h1 className="mb-2 text-xl font-bold">코스를 만들다가 문제가 생겼어요</h1>
      <p role="alert" className="text-sm leading-relaxed text-[var(--color-muted)]">
        다시 시도하면 새 코스를 만들어 드릴게요.
      </p>
      <div className="mt-5 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-button)] bg-[var(--color-primary)] px-6 text-sm font-semibold text-white"
        >
          다시 시도
        </button>
        <Link href="/" className="text-sm font-semibold text-[var(--color-primary)]">
          다른 유형 보기 →
        </Link>
      </div>
      {error.digest && (
        <p className="mt-4 text-xs text-[var(--color-muted)]">오류 번호: {error.digest}</p>
      )}
    </div>
  );
}
