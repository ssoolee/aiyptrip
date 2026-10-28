import { LatLng } from "@/lib/geo";

// docs/prd/02-map-realtime-location-prd.md §3 Should — 외부 지도 앱 길찾기 딥링크.
// 네이버 지도를 우선하고 티맵을 대안으로 둔다. 카카오맵은 로그인 전용이라 제공하지 않는다.

// nmap:// 스킴의 필수 파라미터 — 호출한 서비스를 식별한다 (Firebase App Hosting 백엔드 ID).
const APP_NAME = "yptrip";

export type RouteMode = "car" | "public" | "walk";

export interface RouteTarget extends LatLng {
  name: string;
}

/** 네이버 지도 앱 딥링크. 앱이 없는 환경에서는 열리지 않으므로 웹 URL과 함께 쓴다. */
export function naverAppRouteUrl(dest: RouteTarget, mode: RouteMode = "car", origin?: LatLng): string {
  const params = new URLSearchParams({
    dlat: String(dest.lat),
    dlng: String(dest.lng),
    dname: dest.name,
    appname: APP_NAME,
  });
  if (origin) {
    params.set("slat", String(origin.lat));
    params.set("slng", String(origin.lng));
    params.set("sname", "현재 위치");
  }
  return `nmap://route/${mode}?${params.toString()}`;
}

/** 네이버 지도 웹 길찾기 — 앱이 없어도 열린다. 좌표는 경도,위도 순. */
export function naverWebRouteUrl(dest: RouteTarget, mode: RouteMode = "car", origin?: LatLng): string {
  const to = `${dest.lng},${dest.lat},${encodeURIComponent(dest.name)}`;
  const from = origin ? `${origin.lng},${origin.lat},${encodeURIComponent("현재 위치")}` : "-";
  return `https://map.naver.com/p/directions/${from}/${to}/-/${mode}`;
}

/** 티맵 앱 딥링크 (자동차 전용). */
export function tmapAppRouteUrl(dest: RouteTarget): string {
  const params = new URLSearchParams({
    goalname: dest.name,
    goalx: String(dest.lng),
    goaly: String(dest.lat),
  });
  return `tmap://route?${params.toString()}`;
}
