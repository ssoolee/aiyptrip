import Image from "next/image";

// 홈 첫 화면 히어로 — 양평 마스코트 '평안이'로 서비스를 소개한다.
// 구성(작은 배지 → 큰 제목 → 설명 → 칩 줄 → 캐릭터 그림)은 welflows.com 히어로와 같다.
//
// public/ 아래 로컬 이미지는 next/image를 쓴다. 다른 화면의 <img> + eslint-disable
// 관례는 remotePatterns에 열거할 수 없는 외부 호스트(TourAPI·네이버) 전용이고,
// 로컬 파일은 설정 없이 srcset·WebP 변환·레이아웃 시프트 방지를 그대로 받는다.
// Next 16에서 priority는 deprecated(→ preload)이며, 접힘선 위 이미지는 문서 권고대로
// loading="eager" + fetchPriority="high"로 처리한다 (preload는 <head> 선점이라 과하다).

// 히어로 아래 칩 줄. 이 서비스가 무엇을 해 주는지 한 눈금씩 보여준다.
const POINTS = ["코스 유형 3종", "AI 자연어 검색", "반려동물 동반 지도", "로그인 없이 바로"];

export default function HomeHero() {
  return (
    <section aria-labelledby="home-hero-title" className="px-4">
      <div className="home-hero rounded-[var(--radius-card)] border border-[var(--color-hero-border)] px-5 py-6 sm:px-7 sm:py-8">
        <div className="relative flex flex-col-reverse items-start gap-3 sm:flex-row sm:items-center sm:gap-6">
          <div className="min-w-0 flex-1">
            <p className="mb-3 inline-flex items-center gap-1.5 rounded-[var(--radius-button)] border border-[var(--color-hero-eyebrow)] bg-[var(--color-card)] px-3 py-1 text-xs text-[var(--color-hero-eyebrow)]">
              💧 AI가 짜 주는 양평 여행 코스
            </p>
            <h1
              id="home-hero-title"
              className="display text-[1.9rem] leading-[1.28] sm:text-[2.6rem]"
            >
              평안이와 떠나는
              <br />
              <span className="hl">양평 한 바퀴</span>
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-hero-text)] sm:text-base">
              하고 싶은 여행을 한 줄로 적거나 유형만 고르면, 물방울 친구 평안이가 영업시간과
              이동 동선까지 확인한 코스를 그려드려요.
            </p>
          </div>
          {/* 원본이 425px폭이라 200px보다 크게 띄우면 흐려진다 — 표시 크기를 그 아래로 잡는다. */}
          <Image
            src="/character/hero.png"
            alt=""
            width={425}
            height={497}
            sizes="(min-width: 48rem) 200px, (min-width: 40rem) 168px, 116px"
            loading="eager"
            fetchPriority="high"
            className="mascot-drop h-auto w-[116px] shrink-0 sm:w-[168px] md:w-[200px]"
          />
        </div>
        <ul className="relative mt-5 flex flex-wrap gap-2">
          {POINTS.map((point) => (
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
