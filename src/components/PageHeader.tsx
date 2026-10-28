import Link from "next/link";
import Mascot, { type MascotExpression } from "./Mascot";

// 화면마다 손으로 반복하던 머리말(뒤로가기 + 제목 + 설명)을 한 곳에 모은 것.
// 평안이가 모든 화면에 닿는 통로이기도 하다.
//
// 바깥 여백은 일부러 넣지 않는다 — 화면마다 감싸는 상자의 여백 규칙이 달라서
// (홈·코스는 섹션이 자기 여백을 갖고, 지도·찜은 바깥 상자가 px-4를 갖는다)
// className으로 부르는 쪽이 정한다.
export default function PageHeader({
  backHref,
  backLabel,
  title,
  description,
  expression,
  className,
  children,
}: {
  backHref?: string;
  backLabel?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** 그림은 장식이다 — 무슨 화면인지는 title이 말한다. */
  expression?: MascotExpression;
  className?: string;
  /** 제목 아래에 붙는 탭·칩 같은 하위 컨트롤. */
  children?: React.ReactNode;
}) {
  return (
    <div className={className}>
      {backHref && (
        <Link href={backHref} className="text-sm text-[var(--color-muted)]">
          ← {backLabel}
        </Link>
      )}
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className={`text-xl font-bold${backHref ? " mt-2" : ""}`}>{title}</h1>
          {description && <p className="mt-1 text-sm text-[var(--color-muted)]">{description}</p>}
        </div>
        {expression && (
          <Mascot expression={expression} size={44} className={backHref ? "mt-2" : undefined} />
        )}
      </div>
      {children}
    </div>
  );
}
