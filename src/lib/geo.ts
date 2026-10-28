// 좌표 기반 거리·소요시간 어림값.
// docs/prd/02-map-realtime-location-prd.md §5는 경로 API(네이버 Directions 5 / ODsay)를
// 우선 쓰고 실패 시 "좌표 기반 직선거리 fallback"을 두라고 적는다. 지금은 발급받은 NCP 키에
// Directions 상품 구독이 안 되어 있어 이 fallback만 쓴다 — 화면에서도 직선거리임을 밝힌다.

export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;
// 양평은 국도·지방도 위주라 실제 주행거리가 직선거리보다 길다. 평균 속도를 낮게 잡아
// 그 차이를 흡수한다 (실측 경로 연동 시 이 상수는 사라진다).
const CAR_KMH = 30;
const WALK_KMH = 4;

/** 두 좌표 사이 직선거리(km). */
export function distanceKm(a: LatLng, b: LatLng): number {
  const toRad = (degree: number) => (degree * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** 1km 미만은 10m 단위, 그 이상은 0.1km 단위로 적는다. */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.max(10, Math.round((km * 1000) / 10) * 10)}m`;
  return `${km.toFixed(1)}km`;
}

/** 직선거리 기준 이동시간 어림값(분). 0분으로는 적지 않는다. */
export function estimateMinutes(km: number, mode: "car" | "walk"): number {
  const speed = mode === "car" ? CAR_KMH : WALK_KMH;
  return Math.max(1, Math.round((km / speed) * 60));
}

/** 기준 좌표에서 가장 가까운 항목. 목록이 비어 있으면 null. */
export function nearest<T extends LatLng>(from: LatLng, items: T[]): { item: T; km: number } | null {
  let best: { item: T; km: number } | null = null;
  for (const item of items) {
    const km = distanceKm(from, item);
    if (!best || km < best.km) best = { item, km };
  }
  return best;
}
