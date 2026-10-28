import { HoursStatus, WEEKDAY_LABELS } from "@/lib/businessHours";

// 지금 영업 중인지 한눈에 보여주는 뱃지 (PRD-03 §5). 장소 상세 시트와 코스 상세 화면이 함께 쓴다.
export default function HoursStatusBadge({ status }: { status: HoursStatus }) {
  const base = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold";
  switch (status.kind) {
    case "open":
      return (
        <span className={`${base} bg-[var(--color-primary)] text-white`}>
          영업 중{status.closesAt ? ` · ${status.closesAt} 마감` : " · 24시간"}
        </span>
      );
    case "closed":
      return (
        <span className={`${base} bg-[var(--color-border)] text-[var(--color-muted)]`}>
          영업 종료
          {status.opensAt &&
            ` · ${status.opensWeekday != null ? `${WEEKDAY_LABELS[status.opensWeekday]} ` : ""}${status.opensAt} 오픈`}
        </span>
      );
    case "dayoff":
      return <span className={`${base} bg-[var(--color-accent)]/25`}>오늘 정기휴무</span>;
    default:
      return (
        <span className={`${base} border border-[var(--color-border)] text-[var(--color-muted)]`}>
          영업시간 정보 없음
        </span>
      );
  }
}
