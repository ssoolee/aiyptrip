import Mascot from "./Mascot";

// "평안이가 코스를 짜는 방법" 3단계 서비스 소개. 표정 그림은 장식이라(Mascot이 alt=""를
// 고정한다) 단계의 뜻은 글이 전달한다 — 스크린리더가 같은 말을 두 번 읽지 않도록.
//
// 섹션 제목은 홈에서 SectionHead가 붙여 준다.
const STEPS = [
  {
    expression: "wow",
    step: "01",
    title: "원하는 여행을 알려주세요",
    description: "한 줄로 적어도, 유형만 골라도 돼요.",
  },
  {
    expression: "calm",
    step: "02",
    title: "평안이가 확인해요",
    description: "영업시간·휴무일과 이동 동선까지 검증해요.",
  },
  {
    expression: "happy",
    step: "03",
    title: "코스가 완성돼요",
    description: "지도·사진·연락처를 한 화면에서 봐요.",
  },
] as const;

export default function HomeSteps() {
  return (
    <div className="px-4">
      <ol className="grid gap-3 sm:grid-cols-3">
        {STEPS.map((step) => (
          <li
            key={step.step}
            className="surface-card flex items-center gap-3 p-4 sm:flex-col sm:gap-2 sm:text-center"
          >
            <Mascot expression={step.expression} size={44} />
            <div className="min-w-0">
              <p className="text-[11px] font-bold tracking-[0.12em] text-[var(--color-accent)]">
                {step.step}
              </p>
              <p className="mt-0.5 text-sm font-semibold leading-snug">{step.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--color-subtle)]">
                {step.description}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
