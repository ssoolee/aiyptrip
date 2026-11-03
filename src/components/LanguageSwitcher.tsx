"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LOCALES, type Locale } from "@/lib/i18n/config";
import { stripLang, withLang } from "@/lib/i18n/href";
import { useI18n } from "@/lib/i18n/I18nProvider";

// 상단바의 언어 전환. 보던 화면의 같은 자리로 언어만 바꿔 보낸다.
//
// 자동 감지(Accept-Language)는 넣지 않는다 — CDN 단계에서 가를 수 없고, 자동
// 리다이렉트는 검색 수집과 링크 공유를 모두 망친다. 고르는 건 사람이 한다.
//
// <details>와 <Link>로 두는 이유: 자바스크립트가 아직 안 붙은 사이에도 펼쳐지고
// 눌리며, 링크라서 새 탭으로도 열 수 있다. 언어가 둘일 때는 반대쪽 하나만 보여 줬는데,
// 넷이 되면서 목록으로 바꿨다.
export default function LanguageSwitcher() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const { lang, t } = useI18n();
  const ref = useRef<HTMLDetailsElement>(null);

  // <details>는 바깥을 눌러도 닫히지 않는다 — 상단바에 떠 있는 목록이라 직접 닫아 준다.
  useEffect(() => {
    const close = (event: PointerEvent) => {
      const el = ref.current;
      if (el?.open && !el.contains(event.target as Node)) el.open = false;
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  // 검색 결과 화면(?q=…)에서 언어를 바꿔도 물어본 내용은 그대로 둔다.
  const hrefFor = (locale: Locale) =>
    withLang(locale, stripLang(pathname)) + (search ? `?${search}` : "");

  return (
    <details ref={ref} className="relative shrink-0">
      <summary
        aria-label={`${t.lang.label}: ${t.lang[lang]}`}
        className="flex min-h-9 cursor-pointer list-none items-center gap-1.5 rounded-[var(--radius-button)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-xs text-[var(--color-muted)] hover:border-[var(--color-subtle)] hover:text-[var(--foreground)] [&::-webkit-details-marker]:hidden"
      >
        <span aria-hidden>🌐</span>
        {/* 좁은 화면에서는 상단바에 네 덩이가 들어가므로 아이콘만 남긴다. */}
        <span className="hidden sm:inline">{t.lang[lang]}</span>
      </summary>
      <ul className="surface-card absolute right-0 top-full z-30 mt-1 min-w-32 overflow-hidden py-1 text-xs shadow-lg">
        {LOCALES.map((locale) => (
          <li key={locale}>
            <Link
              href={hrefFor(locale)}
              hrefLang={locale}
              aria-current={locale === lang ? "true" : undefined}
              onClick={() => {
                if (ref.current) ref.current.open = false;
              }}
              className={`block px-3 py-2 hover:bg-[var(--color-border)] ${
                locale === lang ? "font-bold text-[var(--foreground)]" : "text-[var(--color-muted)]"
              }`}
            >
              {t.lang[locale]}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}
