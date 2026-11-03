"use client";

import "./globals.css";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";
import ko from "@/lib/i18n/dictionaries/ko.json";
import en from "@/lib/i18n/dictionaries/en.json";
import ja from "@/lib/i18n/dictionaries/ja.json";
import zh from "@/lib/i18n/dictionaries/zh.json";

// 루트 레이아웃 자체가 깨졌을 때만 열린다 — 레이아웃을 건너뛰므로 html·body를
// 직접 그리고 스타일도 스스로 불러와야 한다. 평안이 그림은 이 상황에서 최적화
// 경로가 함께 죽었을 수 있어 쓰지 않는다.
//
// 이 파일은 다국어가 들어와도 src/app/에 그대로 둔다(문서: "located in the root app
// directory, even when leveraging internationalization"). 그래서 [lang] 레이아웃 밖이고
// I18nProvider도 next/root-params도 쓸 수 없다 — 주소에서 언어를 직접 읽는다.
const DICTS: Record<Locale, typeof ko> = { ko, en, ja, zh };

function localeFromLocation(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  const [first] = window.location.pathname.split("/").filter(Boolean);
  return first && isLocale(first) ? first : DEFAULT_LOCALE;
}

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const locale = localeFromLocation();
  const t = DICTS[locale].error;

  return (
    <html lang={locale}>
      <body>
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <h1 className="mb-2 text-xl font-bold">{t.title}</h1>
          <p role="alert" className="text-sm leading-relaxed text-[var(--color-muted)]">
            {t.body}
          </p>
          <button
            type="button"
            onClick={() => retry()}
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-button)] bg-[var(--color-primary)] px-6 text-sm font-semibold text-[var(--color-on-primary)]"
          >
            {t.retry}
          </button>
          {error.digest && (
            <p className="mt-4 text-xs text-[var(--color-muted)]">
              {t.digest}: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
