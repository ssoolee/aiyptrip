// docs/prd/02-map-realtime-location-prd.md, docs/agents/03-itinerary-composer-agent.md 참조.
// Naver Cloud Platform Geocoding / Directions 5 API (서버 전용 — Secret 키 필요).
//
// NCP 애플리케이션 키가 두 개다 (2026-09-28 실측):
// - Maps 키(NCP_MAPS_API_KEY_ID/KEY): Geocoding·Directions 구독, 지역 검색은 미구독
// - 기존 키(NCP_MAP_CLIENT_ID/SECRET): NAVER API HUB 지역 검색만 구독, Maps는 미구독
// 구독 안 된 API는 "Permission Denied(210)"를 돌려주므로 용도별로 키를 나눠 쓴다.
// 아래 함수들은 실패하면 null을 반환해 호출부가 직선거리(haversine) 등으로 fallback한다.
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
  return apiGatewayHeaders(process.env.NCP_MAP_CLIENT_ID, process.env.NCP_MAP_CLIENT_SECRET);
}

// Maps(Geocoding·Directions)용 인증 헤더.
function getMapsApiHeaders(): Record<string, string> | null {
  return apiGatewayHeaders(process.env.NCP_MAPS_API_KEY_ID, process.env.NCP_MAPS_API_KEY);
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

export interface DrivingRoute {
  distanceMeters: number;
  durationMs: number;
}

// 두 지점 간 자동차 이동거리/시간. 실패 시 null — 호출부가
// haversineDistanceKm 등으로 직선거리 fallback 처리.
export async function getDrivingRoute(from: LatLng, to: LatLng): Promise<DrivingRoute | null> {
  const headers = getMapsApiHeaders();
  if (!headers) return null;

  try {
    const qs = new URLSearchParams({
      start: `${from.lng},${from.lat}`,
      goal: `${to.lng},${to.lat}`,
    });
    const res = await fetch(`${NCP_MAPS_API_BASE}/map-direction/v1/driving?${qs.toString()}`, { headers });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.code !== 0) return null;
    const summary = data?.route?.traoptimal?.[0]?.summary;
    if (!summary) return null;
    return { distanceMeters: summary.distance, durationMs: summary.duration };
  } catch {
    return null;
  }
}

// NCP Directions 구독 전/실패 시 사용하는 직선거리(km) fallback.
export function haversineDistanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
