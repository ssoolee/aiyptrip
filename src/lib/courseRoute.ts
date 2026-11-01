// 코스를 지도·화면에 올릴 때 쓰는 동선 계산. 상세 화면과 카드가 같은 값을 보여야 하므로
// 두 곳에 같은 코드를 적지 않고 여기로 모았다.
import { distanceKm } from "@/lib/geo";
import type { ItineraryDay, ItineraryStop, RoutePoint } from "@/types/travel";

/**
 * 지도에 그릴 구간 경로. i번째가 `stops[i] → stops[i+1]` 구간이고, 길이는 `stops.length - 1`이다.
 *
 * 경로는 "직전 지점에서 여기까지"라 뒤쪽 스팟에 붙어 있다 — 그래서 한 칸 밀어 읽는다.
 * 첫 스팟의 것은 서울에서 오는 구간이라 애초에 저장하지 않는다(지도는 양평만 보여준다).
 */
export function routeLegsOf(stops: ItineraryStop[]): (RoutePoint[] | undefined)[] {
  return stops.slice(1).map((stop) => stop.routeFromPrev);
}

/**
 * 코스를 도는 총거리.
 *
 * 전 구간에 실측 주행거리가 있으면 그 합(`measured: true`)을, 하나라도 없으면 직선거리
 * 합을 돌려준다 — 절반은 주행거리, 절반은 직선거리인 숫자 하나를 내놓는 것보다 정직하다.
 *
 * 세는 구간은 **스팟 사이**뿐이다. 그날 첫 스팟의 `travelMeters`는 출발지(서울 또는 전날
 * 숙소)에서 오는 구간이라, 그대로 더하면 화면에 적은 "N곳을 차례로 이은 동선"과 어긋난다.
 */
export function courseDistance(days: ItineraryDay[]): { km: number; measured: boolean } {
  const flat = days.flatMap((day) => day.stops);
  const straightKm = flat.slice(1).reduce((sum, stop, i) => sum + distanceKm(flat[i], stop), 0);
  if (flat.length < 2) return { km: 0, measured: false };

  let meters = 0;
  let measured = true;

  days.forEach((day, dayIndex) => {
    day.stops.forEach((stop, stopIndex) => {
      if (stopIndex === 0) {
        // 1일차 첫 스팟은 서울에서 오는 길 — 스팟 사이 동선이 아니다.
        if (dayIndex === 0) return;
        // 2일차부터는 전날 묵은 숙소에서 나서므로, 전날이 숙소로 끝났다면 그 구간이
        // 앞 스팟에서 바로 이어지는 길이 된다. 아니면 출발지가 달라 셀 수 없다.
        const prevDay = days[dayIndex - 1];
        const prevLast = prevDay.stops[prevDay.stops.length - 1];
        if (prevLast?.category !== "lodging") {
          measured = false;
          return;
        }
      }
      if (stop.travelMeters == null) measured = false;
      else meters += stop.travelMeters;
    });
  });

  return measured ? { km: meters / 1000, measured: true } : { km: straightKm, measured: false };
}
