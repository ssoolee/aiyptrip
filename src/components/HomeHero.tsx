import Image from "next/image";
import { serverDictionary } from "@/lib/i18n/server";

// 홈 첫 화면 히어로 — 양평 마스코트 '평안이'로 서비스를 소개한다.
// 구성(작은 배지 → 큰 제목 → 설명 → 칩 줄 → 캐릭터 그림)은 welflows.com 히어로와 같다.
//
// 캐릭터 그림은 평안이 소개 사이트(ypcs.web.app)의 '가방을 메고 나서는 날' 6컷 중
// 넷을 골라 2×2로 합친 것이다. 합치는 일은 빌드가 아니라 한 번 하고 끝낸 작업이라
// public/character/hero-travel.png로 커밋돼 있다 — 원본 흰 배경은 가장자리에서
// 이어진 부분만 따내 다크모드에서도 흰 사각형이 보이지 않는다.
//
// public/ 아래 로컬 이미지는 next/image를 쓴다. 다른 화면의 <img> + eslint-disable
// 관례는 remotePatterns에 열거할 수 없는 외부 호스트(TourAPI·네이버) 전용이고,
// 로컬 파일은 설정 없이 srcset·WebP 변환·레이아웃 시프트 방지를 그대로 받는다.
// Next 16에서 priority는 deprecated(→ preload)이며, 접힘선 위 이미지는 문서 권고대로
// loading="eager" + fetchPriority="high"로 처리한다 (preload는 <head> 선점이라 과하다).

// 칩 줄(이 서비스가 무엇을 해 주는지)은 언어마다 다르다 — 사전의 home.heroPoints.
export default async function HomeHero() {
  const { home } = await serverDictionary();

  return (
    <section aria-labelledby="home-hero-title" className="px-4">
      <div className="home-hero rounded-[var(--radius-card)] border border-[var(--color-hero-border)] px-5 py-6 sm:px-7 sm:py-8">
        <div className="relative flex flex-col-reverse items-start gap-3 sm:flex-row sm:items-center sm:gap-6">
          <div className="min-w-0 flex-1">
            <p className="mb-3 inline-flex items-center gap-1.5 rounded-[var(--radius-button)] border border-[var(--color-hero-eyebrow)] bg-[var(--color-card)] px-3 py-1 text-xs text-[var(--color-hero-eyebrow)]">
              {home.heroBadge}
            </p>
            <h1
              id="home-hero-title"
              className="display text-[1.9rem] leading-[1.28] sm:text-[2.6rem]"
            >
              {home.heroTitleTop}
              <br />
              <span className="hl">{home.heroTitleBottom}</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--color-hero-text)] sm:text-base">
              {home.heroBody}
            </p>
          </div>
          {/* 여행 4컷(배낭 메고 출발 → 지도 펼치기 → 길 확인 → 풍경 촬영)을 2×2 한 장으로
              합쳐 둔 그림. 넷이 이 서비스가 하는 일의 순서와 같아 글자를 거들 수 있다.
              원본이 820px 정사각이라 410px까지 또렷하다 — 표시 상한은 그 아래인 280px.
              한 칸이 캐릭터 하나라, 전처럼 한 마리만 띄울 때보다 폭을 넓게 잡아야
              한 마리 크기가 유지된다. 가로폭은 page-width(42rem→64rem)에 맞춰 늘린다. */}
          <Image
            src="/character/hero-travel.png"
            alt=""
            width={820}
            height={820}
            sizes="(min-width: 64rem) 280px, (min-width: 40rem) 240px, 200px"
            loading="eager"
            fetchPriority="high"
            className="mascot-drop h-auto w-[200px] shrink-0 sm:w-[240px] lg:w-[280px]"
          />
        </div>
        <ul className="relative mt-5 flex flex-wrap gap-2">
          {home.heroPoints.map((point) => (
            <li
              key={point}
              className="rounded-[var(--radius-button)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1 text-xs text-[var(--color-muted)]"
            >
              {point}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
