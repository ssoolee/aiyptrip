import { Suspense } from "react";
import Link from "next/link";
import { lang } from "next/root-params";
import LanguageSwitcher from "./LanguageSwitcher";
import Mascot from "./Mascot";
import ThemeToggle from "./ThemeToggle";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { withLang } from "@/lib/i18n/href";

// 모든 화면 위에 붙어 있는 상단바. 자매 사이트 welflows.com(AI행정앱제작소)과
// 같은 구성이다 — 왼쪽에 평안이 얼굴과 서비스 이름, 오른쪽에 포털 링크와 화면 밝기.
//
// 하단 내비(BottomNav)는 이 앱 안을 오가는 길이고, 여기 링크는 바깥(포털)으로
// 나가는 길이라 둘이 겹치지 않는다.
//
// 서버 컴포넌트라 사전을 next/root-params로 직접 읽는다 — prop을 타고 내려보내지
// 않아도 되는 자리다. 클라이언트 컴포넌트에서는 이게 안 되므로 useI18n()을 쓴다.
export default async function SiteHeader() {
  const segment = await lang();
  const locale = segment && isLocale(segment) ? segment : DEFAULT_LOCALE;
  const { site } = getDictionary(locale);

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--background)]">
      <div className="page-width flex h-14 items-center gap-2 px-4">
        <Link
          href={withLang(locale, "/")}
          className="display flex min-w-0 items-center gap-2 text-[17px]"
        >
          <Mascot expression="smile" size={32} />
          <span className="truncate">{site.name}</span>
        </Link>
        <span className="flex-1" />
        <a
          href="https://welflows.com"
          target="_blank"
          rel="noopener"
          className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-[var(--radius-button)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-xs text-[var(--color-muted)] hover:border-[var(--color-subtle)] hover:text-[var(--foreground)]"
        >
          <Mascot expression="wink" size={24} />
          <span className="hidden sm:inline">{site.studio}</span>
          <span className="sm:hidden">{site.studioShort}</span>
        </a>
        {/* 전환 링크가 ?q=·?days= 를 살려 보내려고 useSearchParams를 읽는다 —
            정적으로 그릴 수 있는 화면에서 빌드가 막히지 않게 경계를 둔다. */}
        <Suspense fallback={null}>
          <LanguageSwitcher />
        </Suspense>
        <ThemeToggle />
      </div>
    </header>
  );
}
