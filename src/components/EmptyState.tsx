import Link from "next/link";
import MascotSpot from "./MascotSpot";
import { type MascotExpression } from "./Mascot";

// 보여줄 것이 없을 때 쓰는 공용 상자. 찜 목록에 있던 지역 헬퍼를 그대로 끌어올린 것이라
// 테두리·여백은 전과 같고, 평안이와 (선택) 제목 줄만 더해졌다.
//
// 그림은 장식이므로 무슨 상황인지는 message가 말해야 한다.
export default function EmptyState({
  expression,
  title,
  message,
  href,
  action,
}: {
  expression: MascotExpression;
  title?: string;
  message: React.ReactNode;
  href?: string;
  action?: string;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-border)] p-8 text-center">
      <MascotSpot expression={expression} size={56} className="mb-3" />
      {title && <p className="mb-1 text-sm font-semibold">{title}</p>}
      <p className="mb-3 text-sm text-[var(--color-muted)]">{message}</p>
      {href && action && (
        <Link href={href} className="text-sm font-semibold text-[var(--color-primary)]">
          {action}
        </Link>
      )}
    </div>
  );
}
