// 코스 구간의 실측 주행값 조회. 서버에서만 쓴다.
//
// 이 파일만 경로 캐시(src/lib/data/routeLegs.json)를 읽는다 — 시각을 계산하는
// src/lib/agents/schedule.ts는 클라이언트 컴포넌트가 import하므로, 거기서 이 JSON을
// 읽으면 그대로 브라우저 번들에 실린다. 그래서 schedule.ts는 조회 "함수"만 인자로 받고,
// 표를 들고 있는 일은 여기서 한다.
//
// 표를 채우는 쪽은 scripts/build-routes.ts(오프라인, 커밋됨)이고, 표에 없는 구간만
// 런타임에 Directions를 부른다. 런타임 결과는 파일에 쓰지 않는다 — 함수 런타임의
// 파일시스템은 요청 사이에 남지 않으므로, Next의 fetch 캐시에 맡기는 것이 맞다.
import { getDrivingLegs } from "@/lib/api/ncpMap";
import type { LatLng } from "@/lib/geo";
import { decodePath } from "@/lib/routePath";
import type { RouteLeg, RouteLegLookup } from "@/lib/agents/schedule";
import table from "@/lib/data/routeLegs.json";

interface StoredLeg {
  m: number;
  s: number;
  at: string;
  p?: string;
}

const LEGS = table.legs as Record<string, StoredLeg>;

/** 좌표를 적는 소수 자릿수. 스냅샷 좌표를 그대로 쓰므로 빌드 때와 런타임이 같은 키를 만든다. */
const KEY_DECIMALS = 6;

/**
 * 구간 키. 빌드 스크립트와 런타임이 **같은 함수**를 써야 캐시가 맞으므로 여기만 둔다.
 *
 * 방향을 유지한다 — 일방통행과 우회로 때문에 A→B와 B→A의 주행거리가 실제로 다르다.
 */
export function legKey(from: LatLng, to: LatLng): string {
  const at = (p: LatLng) => `${p.lng.toFixed(KEY_DECIMALS)},${p.lat.toFixed(KEY_DECIMALS)}`;
  return `${at(from)}|${at(to)}`;
}

/** 저장된 초를 분으로 — 화면이 5분 단위로 읽으므로 driveMinutes와 같은 눈금에 맞춘다. */
function toMinutes(seconds: number): number {
  return Math.max(5, Math.round(seconds / 60 / 5) * 5);
}

function toRouteLeg(stored: StoredLeg): RouteLeg {
  const leg: RouteLeg = { meters: stored.m, minutes: toMinutes(stored.s) };
  if (stored.p) leg.path = decodePath(stored.p);
  return leg;
}

/**
 * 커밋된 표만 보는 동기 조회. 미리 만들어 둔 코스(src/lib/curation.ts)가 쓴다 —
 * 목록을 그릴 때마다 돌기 때문에 네트워크를 타서는 안 된다.
 */
export const staticLegLookup: RouteLegLookup = (from, to) => {
  const stored = LEGS[legKey(from, to)];
  return stored ? toRouteLeg(stored) : undefined;
};

/**
 * 표에 없는 구간만 Directions로 채운 조회 함수를 돌려준다.
 * 파이프라인이 그때그때 만드는 코스(src/lib/agents/itineraryComposer.ts)가 쓴다.
 *
 * 실패한 구간은 조용히 비워 두고, 그 구간은 직선거리 어림값으로 메워진다.
 */
export async function resolveRouteLegs(pairs: { from: LatLng; to: LatLng }[]): Promise<RouteLegLookup> {
  const fetched = new Map<string, RouteLeg>();

  // 같은 구간이 여러 번 나와도 한 번만 부른다.
  const missing = new Map<string, { from: LatLng; to: LatLng }>();
  for (const pair of pairs) {
    const key = legKey(pair.from, pair.to);
    if (!LEGS[key]) missing.set(key, pair);
  }

  // 구간마다 따로 부른다 — 파이프라인 코스는 구간 수가 적고(당일치기 6개 안팎),
  // 이어지지 않는 구간이 섞일 수 있어 경유지로 묶는 이득이 작다.
  await Promise.all(
    [...missing].map(async ([key, pair]) => {
      const legs = await getDrivingLegs([pair.from, pair.to]);
      const leg = legs?.[0];
      if (!leg) return;
      fetched.set(key, {
        meters: leg.distanceMeters,
        minutes: toMinutes(leg.durationMs / 1000),
        path: leg.path,
      });
    }),
  );

  return (from, to) => {
    const key = legKey(from, to);
    const stored = LEGS[key];
    return stored ? toRouteLeg(stored) : fetched.get(key);
  };
}
