// 코스 구간의 실제 도로 경로를 다루는 순수 함수들.
//
// 네이버 Directions는 경로를 좌표 884개씩 돌려준다(두물머리~구벼울 4스팟, 2026-10-31 실측).
// 그걸 그대로 들고 다니면 코스 하나가 21KB이고 목록에 카드가 여섯 장 깔리면 130KB가 된다.
// 지도에서 눈으로 구별되지 않는 점을 걷어내면 같은 경로가 88개 좌표 1.8KB로 줄어든다
// (tolerance 20m 기준, 90% 감소). 그래서 저장·전송은 항상 단순화한 뒤에 한다.

// RoutePoint는 **[경도, 위도]** 순서다(네이버 Directions 응답 순서). 이 레포의 LatLng는
// `{lat, lng}`라서 순서가 반대다 — 지도에 넘길 때 `new maps.LatLng(lat, lng)`로 뒤집는다.
import type { RoutePoint } from "@/types/travel";

export type { RoutePoint };

/** 경로 좌표를 적는 소수 자릿수. 5자리면 약 1.1m라, 20m로 단순화한 경로에는 충분하다. */
const COORD_DECIMALS = 5;

/** 위도 1도의 거리(m). 경도는 위도에 따라 줄어들므로 cos을 곱해 쓴다. */
const METERS_PER_DEGREE = 111_320;

/**
 * 점 p에서 선분 s-e까지의 수직거리(m).
 *
 * 위경도를 그대로 쓰면 경도 1도가 위도 1도보다 짧은 것을 무시하게 되어, 가로로 긴 구간이
 * 실제보다 멀어 보인다. 양평 범위에서는 위도를 하나로 고정해 cos을 한 번만 구해도 된다.
 */
function perpendicularMeters(p: RoutePoint, s: RoutePoint, e: RoutePoint, cosLat: number): number {
  const px = (p[0] - s[0]) * METERS_PER_DEGREE * cosLat;
  const py = (p[1] - s[1]) * METERS_PER_DEGREE;
  const ex = (e[0] - s[0]) * METERS_PER_DEGREE * cosLat;
  const ey = (e[1] - s[1]) * METERS_PER_DEGREE;

  const lengthSq = ex * ex + ey * ey;
  // 선분의 양 끝이 같은 점이면 선분이 아니라 점까지의 거리다.
  if (lengthSq === 0) return Math.hypot(px, py);

  // 선분 밖으로 떨어지는 점은 가까운 끝점까지로 재는 것이 맞다 — t를 [0,1]로 자른다.
  const t = Math.max(0, Math.min(1, (px * ex + py * ey) / lengthSq));
  return Math.hypot(px - t * ex, py - t * ey);
}

/**
 * Douglas–Peucker로 경로의 점을 줄인다. 원래 선에서 `toleranceMeters`보다 더 벗어나지
 * 않는 점만 남기므로, 도로의 굽이는 지키면서 직선 구간의 중간점은 사라진다.
 *
 * 시작점과 끝점은 반드시 남는다 — 구간의 양 끝이 스팟 위치라 그것까지 움직이면
 * 선이 마커에서 떨어져 보인다.
 */
export function simplifyPath(path: RoutePoint[], toleranceMeters = 20): RoutePoint[] {
  if (path.length < 3) return path.slice();

  const cosLat = Math.cos((path[0][1] * Math.PI) / 180);
  // 남길 점에 표시를 한다. 재귀 대신 스택으로 도는 이유는 경로가 수백 점이라
  // 최악의 경우(한 점씩 쪼개지는 모양)에 재귀가 그만큼 깊어지기 때문이다.
  const keep = new Array<boolean>(path.length).fill(false);
  keep[0] = true;
  keep[path.length - 1] = true;

  const stack: [number, number][] = [[0, path.length - 1]];
  while (stack.length > 0) {
    const [start, end] = stack.pop()!;
    let worst = -1;
    let worstAt = start;
    for (let i = start + 1; i < end; i += 1) {
      const d = perpendicularMeters(path[i], path[start], path[end], cosLat);
      if (d > worst) {
        worst = d;
        worstAt = i;
      }
    }
    // 가장 많이 벗어난 점조차 허용치 안이면, 사이의 점은 모두 버려도 된다.
    if (worst > toleranceMeters) {
      keep[worstAt] = true;
      stack.push([start, worstAt], [worstAt, end]);
    }
  }

  return path.filter((_, i) => keep[i]);
}

/**
 * 경로를 `"경도,위도;경도,위도"` 한 줄로 적는다.
 *
 * 중첩 배열로 두면 이 레포가 쓰는 `JSON.stringify(data, null, 1)`이 숫자마다 줄을 바꿔
 * 파일이 터지고 diff도 읽을 수 없게 된다. 한 구간이 한 줄이면 사람이 훑어볼 수 있고,
 * 경로를 안 쓰는 화면은 문자열을 쪼개지 않아 파싱 비용도 내지 않는다.
 */
export function encodePath(path: RoutePoint[]): string {
  return path.map(([lng, lat]) => `${lng.toFixed(COORD_DECIMALS)},${lat.toFixed(COORD_DECIMALS)}`).join(";");
}

/** {@link encodePath}로 적은 문자열을 되읽는다. 비었거나 깨진 좌표는 건너뛴다. */
export function decodePath(text: string): RoutePoint[] {
  if (!text) return [];
  const points: RoutePoint[] = [];
  for (const pair of text.split(";")) {
    const [lng, lat] = pair.split(",").map(Number);
    if (Number.isFinite(lng) && Number.isFinite(lat)) points.push([lng, lat]);
  }
  return points;
}
