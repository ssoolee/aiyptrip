"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LOGIN_ENABLED } from "@/lib/featureFlags";

// 로그인을 보류한 동안 '내정보'는 빼 둔다 — flex-1이라 남은 칸이 알아서 나눠 갖는다.
const TABS = [
  { href: "/", label: "홈", emoji: "🏠" },
  { href: "/map", label: "지도", emoji: "🗺️" },
  { href: "/favorites", label: "찜", emoji: "❤️" },
  ...(LOGIN_ENABLED ? [{ href: "/profile", label: "내정보", emoji: "👤" }] : []),
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--color-border)] bg-[var(--color-card)] pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-2xl">
        {TABS.map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
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
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
