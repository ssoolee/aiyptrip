import Mascot from "./Mascot";
import { serverDictionary } from "@/lib/i18n/server";

// 화면 맨 아래 제작 정보. welflows.com 푸터와 같은 글귀를 쓴다 —
// 두 사이트를 오가는 사람이 같은 곳에서 만든 서비스임을 알아볼 수 있게.
export default async function SiteFooter() {
  const { site, footer } = await serverDictionary();

  return (
    <footer className="mt-12 border-t border-[var(--color-border)]">
      <div className="page-width flex flex-wrap items-start justify-between gap-5 px-4 py-7">
        <div className="min-w-0">
          <p className="display text-base">{site.studio}</p>
          <p className="mt-1 text-xs text-[var(--color-subtle)]">
            {footer.studioBody}
          </p>
          <a
            href="https://welflows.com"
            target="_blank"
            rel="noopener"
            className="mt-2 inline-flex items-center gap-1.5 text-xs text-[var(--color-muted)] hover:text-[var(--color-primary)]"
          >
            <Mascot expression="smile" size={24} />
            {footer.characterLink}
          </a>
        </div>
        <div className="min-w-0 text-xs text-[var(--color-subtle)]">
          <p>{footer.madeBy}</p>
          <p className="mt-1">
            {footer.disclaimer}
          </p>
        </div>
      </div>
    </footer>
  );
}
