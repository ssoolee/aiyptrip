"use client";

import MascotSpot from "@/components/MascotSpot";
import { useI18n } from "@/lib/i18n/I18nProvider";

// Next 16의 prop은 reset이 아니라 retry다 — reset은 다시 불러오지 않고 다시 그리기만 한다
// (node_modules/next/dist/docs .../file-conventions/error.md).
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <MascotSpot expression="wow" size={72} className="mb-4" />
      <h1 className="mb-2 text-xl font-bold">{t.error.title}</h1>
      <p role="alert" className="text-sm leading-relaxed text-[var(--color-muted)]">
        {t.error.body}
      </p>
      <button
        type="button"
        onClick={() => retry()}
        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-button)] bg-[var(--color-primary)] px-6 text-sm font-semibold text-[var(--color-on-primary)]"
      >
        {t.error.retry}
      </button>
      {error.digest && (
        <p className="mt-4 text-xs text-[var(--color-muted)]">
          {t.error.digest}: {error.digest}
        </p>
      )}
    </div>
  );
}
