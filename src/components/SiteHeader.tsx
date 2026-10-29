import Link from "next/link";
import Mascot from "./Mascot";
import ThemeToggle from "./ThemeToggle";

// 모든 화면 위에 붙어 있는 상단바. 자매 사이트 welflows.com(AI행정앱제작소)과
// 같은 구성이다 — 왼쪽에 평안이 얼굴과 서비스 이름, 오른쪽에 포털 링크와 화면 밝기.
//
// 하단 내비(BottomNav)는 이 앱 안을 오가는 길이고, 여기 링크는 바깥(포털)으로
// 나가는 길이라 둘이 겹치지 않는다.
export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--background)]">
      <div className="mx-auto flex h-14 max-w-2xl items-center gap-2 px-4">
        <Link href="/" className="display flex min-w-0 items-center gap-2 text-[17px]">
          <Mascot expression="smile" size={32} />
          <span className="truncate">양평 여행 코스</span>
        </Link>
        <span className="flex-1" />
        <a
          href="https://welflows.com"
          target="_blank"
          rel="noopener"
          className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-[var(--radius-button)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-xs text-[var(--color-muted)] hover:border-[var(--color-subtle)] hover:text-[var(--foreground)]"
        >
          <Mascot expression="wink" size={24} />
          <span className="hidden sm:inline">AI행정앱제작소</span>
          <span className="sm:hidden">제작소</span>
        </a>
        <ThemeToggle />
      </div>
    </header>
  );
}
