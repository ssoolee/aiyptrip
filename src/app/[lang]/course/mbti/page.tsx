import Image from "next/image";
import LocaleLink from "@/components/LocaleLink";
import { MBTI_ART_HEIGHT, MBTI_ART_WIDTH, MBTI_GROUPS, MBTI_JOBS, mbtiArtSrc } from "@/lib/mbti";
import PageHeader from "@/components/PageHeader";

// 홈의 "MBTI 성향별" 프리셋이 여는 16유형 선택 화면. 정적 세그먼트라
// /course/[preset]보다 먼저 매칭된다.
//
// 유형마다 직업으로 변신한 평안이가 하나씩 붙는다 (src/lib/mbti.ts의 MBTI_JOBS).
// 글자만 열여섯 칸 늘어서 있을 때는 어느 칸이 어느 칸인지 눈으로 구분되지 않았다.
//
// 그림은 Mascot을 거치지 않고 next/image로 바로 띄운다 — Mascot은 표정 일곱 종을
// 크기까지 타입으로 묶어 두는 통로라, 유형별 그림 열여섯 장과는 결이 다르다
// (홈 히어로도 같은 이유로 직접 쓴다).
export default function MbtiSelectPage() {
  return (
    <div className="page-width px-4 pb-6 pt-6">
      <PageHeader
        className="mb-6"
        backHref="/"
        backLabel="다른 유형 보기"
        title="🔤 MBTI 성향별 여행"
        description="내 MBTI를 고르면 성향에 맞춘 양평 코스를 추천해드려요."
        expression="wink"
      />

      <div className="space-y-5">
        {MBTI_GROUPS.map((group) => (
          <section key={group.label}>
            <h2 className="mb-2 text-sm font-semibold text-[var(--color-muted)]">{group.label}</h2>
            {/* 한 그룹이 네 유형이라 열을 더 늘리면 빈 칸만 생긴다 — sm에서 멈춘다. */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {group.types.map((type) => (
                <LocaleLink
                  key={type}
                  href={`/course/mbti/${type}`}
                  className="surface-card lift flex flex-col items-center gap-0.5 px-2 pb-3 pt-2 text-center transition hover:border-[var(--color-primary)]"
                >
                  {/* 원본이 280px폭이라 140px까지 또렷하다 — 표시 상한을 그 아래로 잡는다. */}
                  <Image
                    src={mbtiArtSrc(type)}
                    alt=""
                    width={MBTI_ART_WIDTH}
                    height={MBTI_ART_HEIGHT}
                    sizes="120px"
                    className="h-auto w-[104px] sm:w-[120px]"
                  />
                  <span className="text-base font-bold tracking-wide">{type}</span>
                  <span className="text-xs text-[var(--color-muted)]">{MBTI_JOBS[type]}</span>
                </LocaleLink>
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-5 text-xs text-[var(--color-subtle)]">
        성격 특징에서 상상한 직업 캐릭터예요. 코스 추천과는 관계가 없어요.
      </p>
    </div>
  );
}
