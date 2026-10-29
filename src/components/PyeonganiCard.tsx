import Mascot from "./Mascot";

// 홈 맨 아래 '평안이는 누구인가' 블록. welflows.com의 .pyeong 섹션과 같은 글귀·같은
// 아이보리 바탕이다 — 캐릭터를 처음 본 사람이 양춘이와의 관계까지 알고 가도록.
export default function PyeonganiCard() {
  return (
    <section
      aria-labelledby="pyeongani-title"
      className="mx-4 flex flex-wrap items-center gap-6 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-character-ivory)] px-6 py-7"
    >
      <Mascot expression="heart" size={56} className="mascot-drop" />
      <div className="min-w-[240px] flex-1">
        <h2 id="pyeongani-title" className="display text-lg">
          🌱 안내를 맡은 친구, 평안이
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
          잔잔한 물결을 닮은 물방울 캐릭터예요. 양평군에는 ‘양’을 맡은 <strong>양춘이</strong>가
          있어서, ‘평’을 맡을 친구로 평안이를 만들었습니다. 둘이 나란히 서면 비로소 ‘양평’이
          완성돼요.
        </p>
        <a
          href="https://welflows.com/pyeongani.html"
          target="_blank"
          rel="noopener"
          className="mt-3 inline-flex min-h-10 items-center rounded-[var(--radius-button)] bg-[var(--color-primary)] px-4 text-sm font-semibold text-[var(--color-on-primary)]"
        >
          평안이 소개 보기 →
        </a>
      </div>
    </section>
  );
}
