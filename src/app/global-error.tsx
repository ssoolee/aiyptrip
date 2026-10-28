"use client";

import "./globals.css";

// 루트 레이아웃 자체가 깨졌을 때만 열린다 — 레이아웃을 건너뛰므로 html·body를
// 직접 그리고 스타일도 스스로 불러와야 한다. 평안이 그림은 이 상황에서 최적화
// 경로가 함께 죽었을 수 있어 쓰지 않는다.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="ko">
      <body>
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
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
      </body>
    </html>
  );
}
