// docs/prd/02-map-realtime-location-prd.md, docs/agents/03-itinerary-composer-agent.md 참조.
// Naver Cloud Platform Geocoding / Directions 5 API (서버 전용 — Secret 키 필요).
//
// NCP 애플리케이션 키가 두 개다 (2026-09-28 실측):
// - Maps 키(NCP_MAPS_KEY_ID/NCP_MAPS_KEY): Geocoding·Directions 구독, 지역 검색은 미구독
// - 검색 키(NCP_SEARCH_KEY_ID/NCP_SEARCH_KEY): NAVER API HUB 지역·블로그 검색만 구독, Maps는 미구독
// 구독 안 된 API는 "Permission Denied(210)"를 돌려주므로 용도별로 키를 나눠 쓴다.
//
// 네 값 모두 API Gateway의 (API Key ID, API Key) 쌍이다 — 네이버 개발자센터의
// X-Naver-Client-Id/Secret이 아니다. 예전 이름(NCP_MAP_CLIENT_ID 등)이 그렇게 읽혀
// 혼동을 불러서, 용도와 정체가 드러나는 이름으로 바꿨다.
// 아래 함수들은 실패하면 null을 반환해 호출부가 직선거리(src/lib/geo.ts) 등으로 fallback한다.
import { simplifyPath } from "@/lib/routePath";
import type { RoutePoint } from "@/types/travel";

const NCP_MAPS_API_BASE = "https://maps.apigw.ntruss.com";

function apiGatewayHeaders(keyId: string | undefined, key: string | undefined): Record<string, string> | null {
  if (!keyId || !key) return null;
  return {
    "x-ncp-apigw-api-key-id": keyId,
    "x-ncp-apigw-api-key": key,
  };
}

// NAVER API HUB(지역 검색, src/lib/api/naverSearch.ts)용 인증 헤더.
export function getNcpApiHeaders(): Record<string, string> | null {
  return apiGatewayHeaders(process.env.NCP_SEARCH_KEY_ID, process.env.NCP_SEARCH_KEY);
}

// Maps(Geocoding·Directions)용 인증 헤더.
function getMapsApiHeaders(): Record<string, string> | null {
  return apiGatewayHeaders(process.env.NCP_MAPS_KEY_ID, process.env.NCP_MAPS_KEY);
}

export interface LatLng {
  lat: number;
  lng: number;
}

// 주소 → 좌표. TourAPI/캐시 데이터가 좌표를 이미 갖고 있어 지금은 좌표
// 누락 시 보완용(scripts/build-mbti-courses.ts)으로만 쓰인다.
export async function geocodeAddress(address: string): Promise<LatLng | null> {
  const headers = getMapsApiHeaders();
  if (!headers) return null;

  try {
    const qs = new URLSearchParams({ query: address });
    const res = await fetch(`${NCP_MAPS_API_BASE}/map-geocode/v2/geocode?${qs.toString()}`, { headers });
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data?.addresses?.[0];
    if (!addr) return null;
    return { lat: Number(addr.y), lng: Number(addr.x) };
  } catch {
    return null;
  }
}

/**
 * 길찾기 옵션. 쿼리의 `option`과 응답의 `route.<option>` 키가 **같은 값**이어야 하므로
 * 상수 하나로 묶어 둔다 — 한쪽만 바꾸면 응답을 못 찾아 조용히 null이 된다.
 * `trafast`(실시간 빠른길)도 같은 모양을 주는 것을 확인했지만(2026-10-31 실측),
 * 코스 시각은 특정 순간의 정체보다 평상시 경로가 맞아 최적 경로를 쓴다.
 */
const ROUTE_OPTION = "traoptimal";

/**
 * 한 번에 넣을 수 있는 지점 수. Directions 5는 경유지가 최대 5개라
 * 출발 + 경유지 5 + 도착 = 7지점, 즉 한 호출에 구간 6개까지다.
 * 더 긴 코스는 호출부가 이 수로 끊어 나눠 부른다.
 */
export const MAX_ROUTE_POINTS = 7;

/** 실측한 한 구간 — 주행거리(m), 주행시간(ms), 그리고 단순화한 도로 경로. */
export interface DrivingLeg {
  distanceMeters: number;
  durationMs: number;
  path: RoutePoint[];
}

/**
 * 지점들을 순서대로 이은 자동차 경로를 **구간별로** 돌려준다 (`points.length - 1`개).
 *
 * 경유지로 한 번에 묻는 이유는 응답이 구간별 거리·시간·`pointIndex`를 함께 주기 때문이다
 * (`summary.waypoints[]`). 구간마다 따로 부르는 것과 값이 같은 것을 확인했으므로
 * (경유지 응답의 첫 구간 7919m = 2지점 호출의 7919m, 2026-10-31 실측),
 * 호출 수를 구간 수만큼 줄이면서 같은 결과를 얻는다.
 *
 * 경로는 저장·전송 전에 반드시 줄여야 하므로 **여기서 단순화해서 내보낸다** —
 * 빌드 스크립트와 런타임 미스 경로가 서로 다른 모양을 쓰지 않게 하려는 것이다.
 *
 * 실패하면 null이고, 호출부는 직선거리 어림값으로 돌아간다.
 */
export async function getDrivingLegs(points: LatLng[]): Promise<DrivingLeg[] | null> {
  const headers = getMapsApiHeaders();
  if (!headers || points.length < 2 || points.length > MAX_ROUTE_POINTS) return null;

  try {
    const qs = new URLSearchParams({
      start: `${points[0].lng},${points[0].lat}`,
      goal: `${points[points.length - 1].lng},${points[points.length - 1].lat}`,
      option: ROUTE_OPTION,
    });
    const waypoints = points.slice(1, -1);
    if (waypoints.length > 0) {
      qs.set("waypoints", waypoints.map((p) => `${p.lng},${p.lat}`).join("|"));
    }

    const res = await fetch(`${NCP_MAPS_API_BASE}/map-direction/v1/driving?${qs.toString()}`, {
      headers,
      // 도로는 자주 바뀌지 않지만 소요시간은 교통을 타므로, 다른 외부 API와 같은 6시간 캐시.
      next: { revalidate: 60 * 60 * 6 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.code !== 0) return null;
    const route = data?.route?.[ROUTE_OPTION]?.[0];
    const summary = route?.summary;
    const path: RoutePoint[] = route?.path;
    if (!summary || !Array.isArray(path) || path.length === 0) return null;

    // summary.waypoints[i]는 "i번째 경유지까지의 구간" 값이다. 마지막 구간만 빠져 있어
    // 전체 합에서 앞 구간들을 빼서 구한다.
    const legs: { distanceMeters: number; durationMs: number }[] = (summary.waypoints ?? []).map(
      (w: { distance: number; duration: number }) => ({ distanceMeters: w.distance, durationMs: w.duration }),
    );
    const used = legs.reduce(
      (acc, leg) => ({ d: acc.d + leg.distanceMeters, t: acc.t + leg.durationMs }),
      { d: 0, t: 0 },
    );
    legs.push({ distanceMeters: summary.distance - used.d, durationMs: summary.duration - used.t });
    if (legs.length !== points.length - 1) return null;

    // pointIndex로 경로를 구간별로 자른다. 경계점은 두 구간이 함께 가져야 선이 끊기지 않는다.
    const bounds = [
      0,
      ...(summary.waypoints ?? []).map((w: { pointIndex: number }) => w.pointIndex),
      path.length - 1,
    ];
    return legs.map((leg, i) => ({
      ...leg,
      path: simplifyPath(path.slice(bounds[i], bounds[i + 1] + 1)),
    }));
  } catch {
    return null;
  }
}
