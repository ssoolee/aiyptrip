import { HoursStatus, WEEKDAY_LABELS } from "@/lib/businessHours";

// 지금 영업 중인지 한눈에 보여주는 뱃지 (PRD-03 §5). 장소 상세 시트와 코스 상세 화면이 함께 쓴다.
export default function HoursStatusBadge({ status }: { status: HoursStatus }) {
  const base = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold";
  switch (status.kind) {
    case "open":
      return (
        <span className={`${base} bg-[var(--color-primary)] text-[var(--color-on-primary)]`}>
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
      return <span className={`${base} bg-[var(--color-character-pink)]/35`}>오늘 정기휴무</span>;
    default:
      // 영업시간을 모르는 장소가 스냅샷 194곳 중 42곳(숙소 20곳 포함) 있다. 원문이 아예
      // 없는 경우와 "점포마다 상이함"처럼 해석할 수 없는 경우가 섞여 있는데, 어느 쪽이든
      // 사용자가 할 일은 같다 — 영업점에 직접 묻는 것. 그래서 "정보 없음"으로 끝내지 않고
      // 다음 행동을 적는다. 통로는 장소 상세 시트 아래의 "전화하기"·"네이버 지도에서 보기".
      return (
        <span className={`${base} border border-[var(--color-border)] text-[var(--color-muted)]`}>
          영업점 문의
        </span>
      );
  }
}
