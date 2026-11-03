import Mascot from "./Mascot";
import { serverDictionary } from "@/lib/i18n/server";

// "평안이가 코스를 짜는 방법" 3단계 서비스 소개. 표정 그림은 장식이라(Mascot이 alt=""를
// 고정한다) 단계의 뜻은 글이 전달한다 — 스크린리더가 같은 말을 두 번 읽지 않도록.
//
// 섹션 제목은 홈에서 SectionHead가 붙여 준다.
// 그림과 번호만 여기 둔다 — 글은 언어마다 다르니 사전(home.steps)에서 짝을 맞춘다.
const STEP_ART = [
  { expression: "wow", step: "01" },
  { expression: "calm", step: "02" },
  { expression: "happy", step: "03" },
] as const;

export default async function HomeSteps() {
  const { home } = await serverDictionary();
  const steps = STEP_ART.map((art, i) => ({ ...art, ...home.steps[i] }));

  return (
    <div className="px-4">
      <ol className="grid gap-3 sm:grid-cols-3">
        {steps.map((step) => (
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
