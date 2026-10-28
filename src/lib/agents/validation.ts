import { ItineraryDay, ItineraryStop } from "@/types/travel";
import { getHoursStatus, parseBusinessHours, seoulNow, WEEKDAY_LABELS } from "@/lib/businessHours";

// docs/agents/04-validation-agent.md 참조.
// 구성된 코스가 실제로 실행 가능한지 본다 — 지금 보는 것은 배정된 시간대의 영업 여부와
// 정기휴무다. 영업시간은 Place.businessHoursRaw(scripts/build-hours.ts가 TourAPI에서
// 모아 둔 자유 텍스트)를 parseBusinessHours로 읽는다.
// 이동시간 검증(checkTravelTimeFeasible)은 실측 경로 API 연동 대기 중 —
// docs/prd/02-map-realtime-location-prd.md §5.

export interface ValidationIssue {
  day: number;
  placeId: string;
  placeName: string;
  reason: string;
}

export interface ValidationResult {
  approved: boolean;
  /** 코스 자체가 성립하지 않는 문제 — 장소를 바꿔도 안 되므로 코스를 버린다. */
  fatal?: string;
  /** 배정된 시간에 닫혀 있는 스팟. 다른 후보로 바꿔야 한다. */
  issues: ValidationIssue[];
  /** 재구성 시 제외할 장소 (04-validation-agent.md의 reject_place_ids). */
  rejectPlaceIds: string[];
  /** 반려 사유는 아니지만 알아 둘 사항 — 영업시간 미확인, 일정보다 이른 마감. */
  notices: ValidationIssue[];
}

/**
 * 숙소는 영업시간이 아니라 체크인/체크아웃 시각만 있어(TourAPI detailIntro2) 검증 대상이
 * 아니다. 스냅샷의 숙소 20곳 모두 businessHoursRaw가 비어 있다.
 */
const SKIP_CATEGORIES = new Set(["lodging"]);

/**
 * 영업시간·정기휴무를 기준으로 코스를 검증한다.
 *
 * `visitWeekday`는 1일차 방문 요일(0=일 … 6=토)이고, 생략하면 한국시간 기준 오늘이다.
 * 2일차는 그 다음 날로 센다. 영업시간을 모르는 장소는 반려하지 않고 notices로 남긴다 —
 * 스냅샷 177곳 중 100곳이 영업시간 출처가 없어, 모르는 곳을 모두 반려하면 코스가
 * 만들어지지 않는다.
 */
export function validateItinerary(
  days: ItineraryDay[],
  options: { visitWeekday?: number } = {},
): ValidationResult {
  const empty = { issues: [], rejectPlaceIds: [], notices: [] };
  if (days.length === 0) return { approved: false, fatal: "생성된 일정이 없습니다.", ...empty };
  if (days.some((d) => d.stops.length === 0)) {
    return { approved: false, fatal: "일부 날짜에 배정 가능한 장소가 없습니다.", ...empty };
  }

  const baseWeekday = options.visitWeekday ?? seoulNow().weekday;
  const issues: ValidationIssue[] = [];
  const notices: ValidationIssue[] = [];

  for (const day of days) {
    const weekday = (baseWeekday + day.day - 1) % 7;
    for (const stop of day.stops) {
      const checked = checkStop(stop, weekday);
      if (!checked) continue;
      const issue = { day: day.day, placeId: stop.placeId, placeName: stop.name, reason: checked.reason };
      (checked.blocking ? issues : notices).push(issue);
    }
  }

  return {
    approved: issues.length === 0,
    issues,
    rejectPlaceIds: [...new Set(issues.map((i) => i.placeId))],
    notices,
  };
}

function checkStop(stop: ItineraryStop, weekday: number): { reason: string; blocking: boolean } | null {
  if (SKIP_CATEGORIES.has(stop.category)) return null;

  const dayLabel = `${WEEKDAY_LABELS[weekday]}요일`;
  const parsed = parseBusinessHours(stop.businessHoursRaw);
  if (!parsed) return { reason: "영업시간이 확인되지 않았습니다.", blocking: false };

  const slot = parseTimeSlot(stop.timeSlot);
  if (!slot) return null;

  const status = getHoursStatus(parsed, { weekday, minutes: slot.start });
  if (status.kind === "dayoff") return { reason: `${dayLabel}은 정기휴무입니다.`, blocking: true };
  if (status.kind === "closed") {
    // 같은 날 늦게 여는 경우만 오픈 시각을 덧붙인다 (다른 요일 오픈은 opensWeekday로 온다).
    const opens = status.opensAt && status.opensWeekday == null ? ` (${status.opensAt} 오픈)` : "";
    return { reason: `${dayLabel} ${stop.timeSlot}에는 영업하지 않습니다.${opens}`, blocking: true };
  }
  // 그 요일 표기가 없으면 영업 여부를 단정할 수 없다 — 반려하지 않고 알리기만 한다.
  if (status.kind === "unknown") return { reason: `${dayLabel} 영업시간 표기가 없습니다.`, blocking: false };

  // 영업 중이지만 일정이 끝나기 전에 문을 닫는 경우. 자정을 넘기는 영업(close > 1440)은
  // 일정보다 이르게 끝날 수 없으므로 그대로 통과한다.
  const today = parsed.days.find((d) => d.weekday === weekday);
  const active = today?.ranges.find((r) => slot.start >= r.open && slot.start < r.close);
  if (slot.end != null && active && active.close < slot.end) {
    return { reason: `일정(${stop.timeSlot})이 끝나기 전에 영업을 마칩니다.`, blocking: false };
  }
  return null;
}

/** "14:00-15:00" → 시작·종료 분. "20:00"처럼 한 시각만 적힌 슬롯은 종료가 없다. */
function parseTimeSlot(timeSlot: string): { start: number; end?: number } | null {
  const times = [...timeSlot.matchAll(/(\d{1,2}):(\d{2})/g)].map((m) => Number(m[1]) * 60 + Number(m[2]));
  if (times.length === 0) return null;
  const [start, end] = times;
  return end != null && end > start ? { start, end } : { start };
}
