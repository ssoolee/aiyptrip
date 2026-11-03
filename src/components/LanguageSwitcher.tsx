"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LOCALES } from "@/lib/i18n/config";
import { stripLang, withLang } from "@/lib/i18n/href";
import { useI18n } from "@/lib/i18n/I18nProvider";

// 상단바의 언어 전환. 보던 화면의 같은 자리로 언어만 바꿔 보낸다.
//
// 자동 감지(Accept-Language)는 넣지 않는다 — CDN 단계에서 가를 수 없고, 자동
// 리다이렉트는 검색 수집과 링크 공유를 모두 망친다. 고르는 건 사람이 한다.
//
// <Link>로 두는 이유: 링크라서 새 탭으로 열 수도 있고, 자바스크립트가 아직 안 붙은
// 사이에도 눌린다. 언어가 둘뿐이라 목록을 펼치지 않고 반대쪽 하나만 보여준다.
export default function LanguageSwitcher() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const { lang, t } = useI18n();

  const other = LOCALES.find((l) => l !== lang);
  if (!other) return null;

  // 검색 결과 화면(?q=…)에서 언어를 바꿔도 물어본 내용은 그대로 둔다.
  const target = withLang(other, stripLang(pathname)) + (search ? `?${search}` : "");

  return (
    <Link
      href={target}
      hrefLang={other}
      aria-label={`${t.lang.label}: ${t.lang[other]}`}
      className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-[var(--radius-button)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-xs text-[var(--color-muted)] hover:border-[var(--color-subtle)] hover:text-[var(--foreground)]"
    >
      <span aria-hidden>🌐</span>
      {/* 좁은 화면에서는 상단바에 네 덩이가 들어가므로 아이콘만 남긴다. */}
      <span className="hidden sm:inline">{t.lang[other]}</span>
    </Link>
  );
}
