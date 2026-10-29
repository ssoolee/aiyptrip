import Mascot from "./Mascot";

// 화면 맨 아래 제작 정보. welflows.com 푸터와 같은 글귀를 쓴다 —
// 두 사이트를 오가는 사람이 같은 곳에서 만든 서비스임을 알아볼 수 있게.
export default function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-[var(--color-border)]">
      <div className="mx-auto flex max-w-2xl flex-wrap items-start justify-between gap-5 px-4 py-7">
        <div className="min-w-0">
          <p className="display text-base">AI행정앱제작소</p>
          <p className="mt-1 text-xs text-[var(--color-subtle)]">
            행정 업무와 지역의 일상을 가볍게 만드는 AI 웹앱을 만듭니다.
          </p>
          <a
            href="https://welflows.com"
            target="_blank"
            rel="noopener"
            className="mt-2 inline-flex items-center gap-1.5 text-xs text-[var(--color-muted)] hover:text-[var(--color-primary)]"
          >
            <Mascot expression="smile" size={24} />
            평안이 캐릭터 소개
          </a>
        </div>
        <div className="min-w-0 text-xs text-[var(--color-subtle)]">
          <p>🛠️ 제작 · AI행정앱제작소</p>
          <p className="mt-1">
            평안이는 양평군 공식 캐릭터가 아니라, 양평을 아끼는 마음으로 만든 비공식 창작
            캐릭터예요.
          </p>
        </div>
      </div>
    </footer>
  );
}
