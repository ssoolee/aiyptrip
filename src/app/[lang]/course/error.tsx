"use client";

import LocaleLink from "@/components/LocaleLink";
import MascotSpot from "@/components/MascotSpot";
import { useI18n } from "@/lib/i18n/I18nProvider";

// 코스를 만드는 길(LLM·외부 API)에서 난 오류만 여기서 받는다. 다시 시도하면
// retry()가 서버 컴포넌트를 다시 돌려 새 코스를 만든다.
export default function CourseError({
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
      <h1 className="mb-2 text-xl font-bold">{t.error.courseTitle}</h1>
      <p role="alert" className="text-sm leading-relaxed text-[var(--color-muted)]">
        {t.error.courseBody}
      </p>
      <div className="mt-5 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-button)] bg-[var(--color-primary)] px-6 text-sm font-semibold text-[var(--color-on-primary)]"
        >
          {t.error.retry}
        </button>
        <LocaleLink href="/" className="text-sm font-semibold text-[var(--color-primary)]">
          {t.error.courseBack}
        </LocaleLink>
      </div>
      {error.digest && (
        <p className="mt-4 text-xs text-[var(--color-muted)]">
          {t.error.digest}: {error.digest}
        </p>
      )}
    </div>
  );
}
