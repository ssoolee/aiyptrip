import { distanceKm, type LatLng } from "@/lib/geo";
import { Category, ItineraryDay, ItineraryStop } from "@/types/travel";

// 코스의 시각을 "서울에서 출발하는 사람" 기준으로 계산한다.
//
// 지금까지는 템플릿에 적어 둔 고정 시간대("14:00-15:00")를 그대로 붙였기 때문에,
// 서울에서 오는 데 걸리는 한 시간도, 스팟 사이 이동도, 한 곳에 머무는 시간도
// 일정에 반영되지 않았다. 여기서는 출발 시각에서 시작해
//   도착 = 직전 지점 종료 + 이동시간,  종료 = 시작 + 체류시간
// 을 사슬처럼 이어 실제로 돌 수 있는 시각을 만든다.
//
// 이동시간은 아직 어림값이다 — 실측 경로 API(NCP Directions / ODsay)는 키에 상품
// 구독이 안 되어 대기 중이고(docs/prd/02-map-realtime-location-prd.md §5),
// 그동안은 직선거리에 거리대별 평균 속도를 적용한다. 화면에서도 어림값임을 밝힌다.

/** 서울 출발지 기준점 — 서울시청. */
export const SEOUL_ORIGIN: LatLng = { lat: 37.5665, lng: 126.978 };
export const SEOUL_LABEL = "서울(시청 기준)";

/** 당일치기·1일차에 서울을 떠나는 시각. */
export const DEPART_SEOUL_MINUTES = 9 * 60;
/** 둘째 날 숙소에서 나서는 시각(체크아웃). */
export const CHECKOUT_MINUTES = 10 * 60;

/**
 * 카테고리별 평균 체류시간(분). 관광지는 한 바퀴 돌아보는 데, 식당은 대기와 식사,
 * 카페는 자리에 앉아 쉬는 시간을 상식적인 수준으로 잡은 값이다.
 * 숙소는 체크인 시각만 찍고 그날 일정을 끝낸다.
 */
export const DWELL_MINUTES: Record<Category, number> = {
  attraction: 90,
  restaurant: 70,
  cafe: 60,
  lodging: 0,
};

/** 아무리 일찍 닿아도 이 시각 전에는 밥을 먹지 않는다. */
const MEAL_EARLIEST = { lunch: 11 * 60 + 40, dinner: 17 * 60 };

/**
 * 직선거리 기준 평균 속도(km/h). 거리대로 나누는 이유는 한 값으로는 양쪽을 다
 * 망치기 때문이다 — 양평 안의 국도 구간을 기준으로 잡으면 서울~양평이 두 시간이 되고,
 * 고속도로를 기준으로 잡으면 읍내 안을 5분 만에 가는 것으로 나온다.
 * 직선거리에 적용하는 값이라 우회·신호 대기가 이미 녹아 있다.
 */
function averageKmh(km: number): number {
  if (km < 5) return 22;
  if (km < 20) return 32;
  return 42;
}

/** 두 지점 사이 자동차 이동시간 어림값(분). 5분 단위로 끊어 읽기 쉽게 한다. */
export function driveMinutes(from: LatLng, to: LatLng): number {
  const km = distanceKm(from, to);
  return Math.max(5, Math.round((km / averageKmh(km)) * 60 / 5) * 5);
}

/** 걸리는 시간을 사람이 읽는 말로 — 65 → "1시간 5분", 45 → "45분". */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}시간` : `${hours}시간 ${rest}분`;
}

/** 분(0=자정)을 "09:05"로. 자정을 넘긴 값도 그날 시계로 돌려 적는다. */
export function formatClock(minutes: number): string {
  const wrapped = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const hour = Math.floor(wrapped / 60);
  return `${String(hour).padStart(2, "0")}:${String(wrapped % 60).padStart(2, "0")}`;
}

/**
 * 장소와 순서가 정해진 코스에 실제 시각을 입힌다.
 *
 * - 1일차는 서울에서 {@link DEPART_SEOUL_MINUTES}에 출발한다.
 * - 2일차부터는 전날 묵은 숙소에서 {@link CHECKOUT_MINUTES}에 나선다
 *   (숙소가 없으면 다시 서울에서 출발한 것으로 본다).
 * - 그날 첫 식당은 점심, 두 번째 식당은 저녁으로 보고 너무 이른 식사를 막는다.
 * - 마지막 날 마지막 스팟 뒤에는 서울로 돌아가는 시간을 붙인다.
 *
 * 들어온 코스의 장소·순서는 바꾸지 않는다 — 시각만 다시 쓴다.
 */
export function scheduleItinerary(days: ItineraryDay[]): ItineraryDay[] {
  let origin = SEOUL_ORIGIN;
  let originLabel = SEOUL_LABEL;
  let departAt = DEPART_SEOUL_MINUTES;

  return days.map((day, index) => {
    const isLastDay = index === days.length - 1;
    // 이 날의 출발지·출발 시각. 아래에서 다음 날 값으로 덮기 전에 붙잡아 둔다.
    const dayOriginLabel = originLabel;
    const dayDepartAt = departAt;
    const stops: ItineraryStop[] = [];
    let from = origin;
    let clock = dayDepartAt;
    let meals = 0;
    let firstLeg = 0;
    let firstStart = dayDepartAt;

    for (const stop of day.stops) {
      const travel = driveMinutes(from, stop);
      if (stops.length === 0) firstLeg = travel;

      let start = clock + travel;
      if (stop.category === "restaurant") {
        meals += 1;
        const earliest = meals === 1 ? MEAL_EARLIEST.lunch : MEAL_EARLIEST.dinner;
        start = Math.max(start, earliest);
      }
      if (stops.length === 0) firstStart = start;
      const dwell = DWELL_MINUTES[stop.category];
      stops.push({
        ...stop,
        timeSlot: dwell > 0 ? `${formatClock(start)}-${formatClock(start + dwell)}` : formatClock(start),
        travelMinutes: travel,
      });

      clock = start + dwell;
      from = stop;
    }

    // 이 날 묵는 숙소가 다음 날의 출발지가 된다.
    const lodging = day.stops.find((stop) => stop.category === "lodging");
    if (lodging) {
      origin = lodging;
      originLabel = lodging.name;
      departAt = CHECKOUT_MINUTES;
    }

    const scheduled: ItineraryDay = { ...day, stops };
    if (stops.length > 0) {
      // 첫 스팟이 점심이면 아침 일찍 가 봐야 두 시간을 기다린다 — 그만큼 늦게 나선다.
      // (하한은 출발 시각이라, 기다릴 일이 없는 코스는 09:00/10:00 그대로다.)
      const leaveAt = Math.max(dayDepartAt, firstStart - firstLeg);
      scheduled.departure = { place: dayOriginLabel, at: formatClock(leaveAt), minutes: firstLeg };
      // 숙소에서 하루를 마치는 날은 돌아갈 곳이 없다.
      if (isLastDay && !lodging) {
        const home = driveMinutes(from, SEOUL_ORIGIN);
        scheduled.arrival = { place: SEOUL_LABEL, at: formatClock(clock + home), minutes: home };
      }
    }
    return scheduled;
  });
}
