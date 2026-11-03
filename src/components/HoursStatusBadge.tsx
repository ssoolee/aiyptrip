"use client";

import { HoursStatus } from "@/lib/businessHours";
import { fill } from "@/lib/i18n/format";
import { useI18n } from "@/lib/i18n/I18nProvider";

// 지금 영업 중인지 한눈에 보여주는 뱃지 (PRD-03 §5). 장소 상세 시트와 코스 상세 화면이 함께 쓴다.
//
// 요일 이름은 businessHours의 WEEKDAY_LABELS가 아니라 사전에서 가져온다 — 그쪽은
// 한국어 원문을 **해석**할 때 쓰는 표라 번역하면 파서가 깨진다. 화면에 쓰는 이름은
// 따로 둔다(hours.weekdays).
export default function HoursStatusBadge({ status }: { status: HoursStatus }) {
  const { t } = useI18n();
  const base = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold";

  switch (status.kind) {
    case "open":
      return (
        <span className={`${base} bg-[var(--color-primary)] text-[var(--color-on-primary)]`}>
          {status.closesAt
            ? fill(t.hours.openUntil, { time: status.closesAt })
            : `${t.hours.open} · ${t.hours.allDay}`}
        </span>
      );
    case "closed":
      return (
        <span className={`${base} bg-[var(--color-border)] text-[var(--color-muted)]`}>
          {!status.opensAt
            ? t.hours.closed
            : status.opensWeekday != null
              ? fill(t.hours.closedUntilWeekday, {
                  weekday: t.hours.weekdays[status.opensWeekday],
                  time: status.opensAt,
                })
              : fill(t.hours.closedUntil, { time: status.opensAt })}
        </span>
      );
    case "dayoff":
      return (
        <span className={`${base} bg-[var(--color-character-pink)]/35`}>{t.hours.holidayToday}</span>
      );
    default:
      // 영업시간을 모르는 장소가 스냅샷 194곳 중 42곳(숙소 20곳 포함) 있다. 원문이 아예
      // 없는 경우와 "점포마다 상이함"처럼 해석할 수 없는 경우가 섞여 있는데, 어느 쪽이든
      // 사용자가 할 일은 같다 — 영업점에 직접 묻는 것. 그래서 "정보 없음"으로 끝내지 않고
      // 다음 행동을 적는다. 통로는 장소 상세 시트 아래의 "전화하기"·"네이버 지도에서 보기".
      return (
        <span className={`${base} border border-[var(--color-border)] text-[var(--color-muted)]`}>
          {t.hours.askStore}
        </span>
      );
  }
}
