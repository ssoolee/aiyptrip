"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LOGIN_ENABLED } from "@/lib/featureFlags";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { stripLang } from "@/lib/i18n/href";
import type { Dictionary } from "@/lib/i18n/dictionaries";

// 로그인을 보류한 동안 '내정보'는 빼 둔다 — flex-1이라 남은 칸이 알아서 나눠 갖는다.
// key는 사전의 nav 아래 이름이다 — 오타를 내면 타입에서 걸린다.
const TABS: { path: string; key: keyof Dictionary["nav"]; emoji: string }[] = [
  { path: "/", key: "home", emoji: "🏠" },
  { path: "/map", key: "map", emoji: "🗺️" },
  { path: "/favorites", key: "favorites", emoji: "❤️" },
  ...(LOGIN_ENABLED ? [{ path: "/profile", key: "profile" as const, emoji: "👤" }] : []),
];

export default function BottomNav() {
  const pathname = usePathname();
  const { t, href } = useI18n();
  // 어느 칸인지 볼 때는 언어를 떼고 본다 — 주소가 /en/map이라 startsWith("/map")이
  // 영원히 거짓이 된다. 언어 prefix가 들어오면서 생긴 함정이다.
  const path = stripLang(pathname);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--color-border)] bg-[var(--color-card)] pb-[env(safe-area-inset-bottom)]">
      <ul className="page-width flex">
        {TABS.map((tab) => {
          const active = tab.path === "/" ? path === "/" : path.startsWith(tab.path);
          return (
            <li key={tab.path} className="flex-1">
              <Link
                href={href(tab.path)}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-[58px] flex-col items-center justify-center gap-0.5 text-xs ${
                  active
                    ? "font-bold text-[var(--color-primary)]"
                    : "text-[var(--color-subtle)]"
                }`}
              >
                {/* 고른 칸 위에 깔리는 짧은 막대 — 포털 카드의 윗선과 같은 표시다. */}
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-x-5 top-0 h-[3px] rounded-b-[3px] bg-[var(--color-primary)]"
                  />
                )}
                <span className="text-lg leading-none" aria-hidden>
                  {tab.emoji}
                </span>
                {t.nav[tab.key]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
