"use client";

import MascotSpot from "@/components/MascotSpot";

// Next 16의 prop은 reset이 아니라 retry다 — reset은 다시 불러오지 않고 다시 그리기만 한다
// (node_modules/next/dist/docs .../file-conventions/error.md).
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <MascotSpot expression="wow" size={72} className="mb-4" />
      <h1 className="mb-2 text-xl font-bold">앗, 문제가 생겼어요</h1>
      <p role="alert" className="text-sm leading-relaxed text-[var(--color-muted)]">
        잠시 후 다시 시도해 주세요.
      </p>
      <button
        type="button"
        onClick={() => retry()}
        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-button)] bg-[var(--color-primary)] px-6 text-sm font-semibold text-white"
      >
        다시 시도
      </button>
      {error.digest && (
        <p className="mt-4 text-xs text-[var(--color-muted)]">오류 번호: {error.digest}</p>
      )}
    </div>
  );
}
