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
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-[var(--color-border)] bg-[var(--color-card)] pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-2xl">
        {TABS.map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-xs ${
                  active ? "text-[var(--color-primary)] font-semibold" : "text-[var(--color-muted)]"
                }`}
              >
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
