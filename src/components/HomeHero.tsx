import Image from "next/image";

// 홈 첫 화면 히어로 — 양평 마스코트 '평안이'로 서비스를 소개한다.
//
// public/ 아래 로컬 이미지는 next/image를 쓴다. 다른 화면의 <img> + eslint-disable
// 관례는 remotePatterns에 열거할 수 없는 외부 호스트(TourAPI·네이버) 전용이고,
// 로컬 파일은 설정 없이 srcset·WebP 변환·레이아웃 시프트 방지를 그대로 받는다.
// Next 16에서 priority는 deprecated(→ preload)이며, 접힘선 위 이미지는 문서 권고대로
// loading="eager" + fetchPriority="high"로 처리한다 (preload는 <head> 선점이라 과하다).
export default function HomeHero() {
  return (
    <section aria-labelledby="home-hero-title" className="px-4">
      <div className="home-hero rounded-[var(--radius-card)] border border-[var(--color-hero-border)] px-4 py-5 sm:px-6 sm:py-7">
        <div className="flex items-start gap-3 sm:items-center sm:gap-6">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-[var(--color-hero-eyebrow)]">양평 AI 여행 코스</p>
            <h1 id="home-hero-title" className="mt-1 text-[1.6rem] font-bold leading-[1.3] sm:text-4xl">
              평안이와 떠나는
              <br />
              양평 한 바퀴
            </h1>
            <p className="mt-2 text-[0.95rem] font-medium leading-relaxed sm:mt-3 sm:text-base">
              나에게 딱 맞는 양평 여행, 물방울 친구 평안이가 코스로 그려드려요.
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
            className="h-auto w-[116px] shrink-0 sm:w-[168px] md:w-[200px]"
          />
        </div>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-hero-text)] sm:mt-4">
          MBTI 성향에 따라, 반려동물과 함께, 오늘의 기분까지 — 원하는 여행을 적거나 어울리는
          유형만 고르면 AI가 영업시간과 동선까지 확인한 코스를 바로 만들어 드려요.
        </p>
      </div>
    </section>
  );
}
