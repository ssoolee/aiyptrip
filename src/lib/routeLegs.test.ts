// 실행: npm test
//
// 커밋된 경로 캐시(src/lib/data/routeLegs.json)가 커밋된 큐레이션 코스와 맞는지 본다.
// 코스를 다시 생성(npm run build:solo / build:mbti)하고 npm run build:routes를 잊으면
// 구간 키가 어긋나 코스 전체가 조용히 어림값으로 돌아간다 — 그걸 여기서 잡는다.
import assert from "node:assert/strict";
import { test } from "node:test";
import { courseLegPairs } from "@/lib/agents/schedule";
import { rehydrateCourse } from "@/lib/curation";
import { distanceKm } from "@/lib/geo";
import { legKey, staticLegLookup } from "@/lib/routeLegs";
import soloCourses from "@/lib/data/soloCourses.json";
import mbtiCourses from "@/lib/data/mbtiCourses.json";
import type { Course } from "@/types/travel";

const CURATED: Course[] = [
  ...Object.values(soloCourses.durations as Record<string, Course[]>).flat(),
  ...Object.values(mbtiCourses.types as Record<string, { courses?: Course[] }>).flatMap((t) => t.courses ?? []),
];

test("큐레이션 코스가 쓰는 구간은 모두 캐시에 있다", () => {
  const missing: string[] = [];
  for (const course of CURATED) {
    for (const pair of courseLegPairs(course.days)) {
      if (!staticLegLookup(pair.from, pair.to)) missing.push(`${course.courseId} ${legKey(pair.from, pair.to)}`);
    }
  }
  assert.deepEqual(missing, [], `캐시에 없는 구간 ${missing.length}개 — npm run build:routes를 실행하세요`);
});

test("되살린 큐레이션 코스의 스팟은 실측 주행거리를 갖는다", () => {
  for (const course of CURATED) {
    const rehydrated = rehydrateCourse(course);
    for (const day of rehydrated.days) {
      for (const stop of day.stops) {
        assert.ok(
          stop.travelMeters != null,
          `${course.courseId} ${stop.name}에 실측 주행거리가 없다`,
        );
        assert.ok(stop.travelMinutes != null && stop.travelMinutes > 0, `${stop.name} 이동시간`);
      }
    }
  }
});

test("양평 안의 구간에는 지도에 그릴 경로가 있고, 서울 구간에는 없다", () => {
  // 서울 구간은 지도에 그리지 않으므로 경로를 저장하지 않는다 — 넣으면 쓰이지도 않고
  // 코스마다 수 KB를 더 실어 보내게 된다.
  const [first] = CURATED;
  const rehydrated = rehydrateCourse(first);
  const stops = rehydrated.days.flatMap((day) => day.stops);

  assert.equal(stops[0].routeFromPrev, undefined, "첫 스팟은 서울에서 오는 구간이라 경로가 없다");
  for (const stop of stops.slice(1)) {
    assert.ok((stop.routeFromPrev?.length ?? 0) > 1, `${stop.name}에 도로 경로가 없다`);
  }
});

test("주행거리는 직선거리보다 길다", () => {
  // 실측이 제대로 붙었는지 보는 가장 간단한 신호 — 양평은 강과 산을 돌아가므로
  // 도로 거리가 직선거리보다 짧을 수 없다.
  const rehydrated = rehydrateCourse(CURATED[0]);
  const pairs = courseLegPairs(rehydrated.days);
  for (const pair of pairs) {
    const leg = staticLegLookup(pair.from, pair.to);
    if (!leg) continue;
    const straightMeters = distanceKm(pair.from, pair.to) * 1000;
    assert.ok(leg.meters >= straightMeters, `${leg.meters}m < 직선 ${Math.round(straightMeters)}m`);
  }
});
