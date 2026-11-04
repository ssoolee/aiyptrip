"use client";

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
// 갈 수 있는 언어를 **한 번에 눌러 갈 수 있게** 펼쳐 둔다(펼침 메뉴가 아니다).
//
// 지금 보고 있는 언어는 칸에 넣지 않는다. 자기 자신으로 가는 링크는 눌러도 아무 일이
// 없고, 화면이 이미 그 언어다. 언어가 둘일 때 반대쪽 하나만 보여주던 것과 같은 규칙이다.
// 자리도 아낀다 — 상단바는 h-14에 이미 네 덩이가 있어 칸 하나가 서비스 이름을 밀어낸다.
//
// 칸에는 언어 코드만 적는다. "한국어 English 日本語 简体中文"을 그대로 적으면 390px에서
// 넘치기 때문이고, 제대로 된 이름은 title과 aria-label에 남긴다. 코드는 어느 언어로
// 보든 같은 글자라 번역할 것도 없다.
//
// <Link>로 두는 이유: 링크라서 새 탭으로도 열리고, 자바스크립트가 아직 안 붙은
// 사이에도 눌린다.
export default function LanguageSwitcher() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const { lang, t } = useI18n();

  // 검색 결과 화면(?q=…)에서 언어를 바꿔도 물어본 내용은 그대로 둔다.
  const hrefFor = (locale: Locale) =>
    withLang(locale, stripLang(pathname)) + (search ? `?${search}` : "");

  return (
    <nav
      aria-label={t.lang.label}
      className="flex min-h-9 shrink-0 items-center overflow-hidden rounded-[var(--radius-button)] border border-[var(--color-border)] bg-[var(--color-card)] text-xs"
    >
      {LOCALES.filter((locale) => locale !== lang).map((locale) => (
        <Link
          key={locale}
          href={hrefFor(locale)}
          hrefLang={locale}
          title={t.lang[locale]}
          aria-label={t.lang[locale]}
          className="flex min-h-9 items-center px-2 text-[var(--color-muted)] hover:bg-[var(--color-border)] hover:text-[var(--foreground)]"
        >
          {locale.toUpperCase()}
        </Link>
      ))}
    </nav>
  );
}
