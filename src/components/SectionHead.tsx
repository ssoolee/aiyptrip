import Mascot, { type MascotExpression } from "./Mascot";

// 섹션 머리(평안이 얼굴 + 제목 + 한 줄 설명). welflows.com의 .sechead와 같은 모양이라
// 두 사이트의 화면 리듬이 맞는다.
//
// 그림은 장식이다(Mascot이 alt=""를 고정한다) — 무슨 섹션인지는 title이 말한다.
export default function SectionHead({
  expression,
  title,
  description,
  className,
}: {
  expression: MascotExpression;
  title: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-center gap-x-2.5 gap-y-1${className ? ` ${className}` : ""}`}>
      <Mascot expression={expression} size={32} />
      <h2 className="display text-lg">{title}</h2>
      {description && <p className="text-xs text-[var(--color-subtle)]">{description}</p>}
    </div>
  );
}
