// 코스 구간의 실제 도로 경로·주행시간을 미리 받아 둔다(src/lib/data/routeLegs.json).
// 실행: npm run build:routes   (다시 재기: npm run build:routes -- --force)
//
// 요청마다 Directions를 부르지 않는 이유는 두 가지다. ① 미리 만들어 둔 코스는 목록을
// 그릴 때마다 시각을 다시 계산하므로(src/lib/curation.ts) 거기서 네트워크를 타면
// "사전 생성 코스 노출 지연 ≤ 0.5초"(PRD-01 §8)를 지킬 수 없다. ② 같은 구간이 코스마다
// 반복된다 — 큐레이션 코스 28개가 쓰는 고유 구간은 135개뿐이다.
//
// 호출은 경유지로 묶어 코스당 1~2회로 끝낸다. 이미 받아 둔 구간은 건너뛰므로 다시 돌려도
// 호출이 0건이고, 교통 상황이 녹아 있는 소요시간을 새로 재려면 --force를 준다.
import { loadEnvConfig } from "@next/env";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { ItineraryDay, LodgingPick } from "@/types/travel";

loadEnvConfig(process.cwd());

const OUTPUT = path.join(process.cwd(), "src/lib/data/routeLegs.json");

/** 호출 사이 간격. 오프라인 빌드라 느려도 상관없고, 연속 호출로 한도를 건드리지 않는다. */
const PAUSE_MS = 300;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface StoredLeg {
  /** 주행거리(m) */
  m: number;
  /** 주행시간(초) — 분으로 끊는 일은 읽는 쪽이 한다. */
  s: number;
  /** 측정 시각. Directions의 소요시간은 그 순간의 교통을 반영한다. */
  at: string;
  /** 단순화한 도로 경로. 지도에 안 그리는 서울 구간에는 넣지 않는다. */
  p?: string;
}

async function main() {
  // env 로드 뒤에 import해야 모듈이 키를 읽는다.
  const { courseLegPairs, SEOUL_ORIGIN } = await import("@/lib/agents/schedule");
  const { getDrivingLegs, MAX_ROUTE_POINTS } = await import("@/lib/api/ncpMap");
  const { legKey } = await import("@/lib/routeLegs");
  const { encodePath } = await import("@/lib/routePath");
  const soloCourses = (await import("@/lib/data/soloCourses.json")).default;
  const mbtiCourses = (await import("@/lib/data/mbtiCourses.json")).default;

  const force = process.argv.includes("--force");
  const stored: Record<string, StoredLeg> = force ? {} : readStored();
  const before = Object.keys(stored).length;

  // 커밋된 큐레이션 코스에서 날짜 묶음만 모은다.
  const allDays: ItineraryDay[][] = [];
  for (const courses of Object.values(soloCourses.durations as Record<string, { days: ItineraryDay[] }[]>)) {
    for (const course of courses) allDays.push(course.days);
  }
  for (const entry of Object.values(
    mbtiCourses.types as Record<string, { courses?: { days: ItineraryDay[] }[]; lodgings?: LodgingPick[] }>,
  )) {
    for (const course of entry.courses ?? []) allDays.push(course.days);
  }

  const isSeoul = (p: { lat: number; lng: number }) =>
    p.lat === SEOUL_ORIGIN.lat && p.lng === SEOUL_ORIGIN.lng;

  let asked = 0;
  let failed = 0;
  let calls = 0;
  const seen = new Set<string>();

  for (const days of allDays) {
    // 스케줄러가 조회하는 것과 똑같은 구간 목록 — 열거를 한 곳에만 두기 위해 같은 함수를 쓴다.
    const pairs = courseLegPairs(days);
    // 이어지는 구간은 한 번의 경유지 호출로 묶는다. from이 앞 구간의 to와 같을 때만 이을 수 있다.
    const chains: (typeof pairs)[] = [];
    for (const pair of pairs) {
      const last = chains[chains.length - 1];
      const prev = last?.[last.length - 1];
      const joins = prev && prev.to.lat === pair.from.lat && prev.to.lng === pair.from.lng;
      if (joins && last.length < MAX_ROUTE_POINTS - 1) last.push(pair);
      else chains.push([pair]);
    }

    for (const chain of chains) {
      const keys = chain.map((p) => legKey(p.from, p.to));
      keys.forEach((k) => seen.add(k));
      // 이 묶음의 구간이 이미 전부 있으면 부르지 않는다.
      if (keys.every((k) => stored[k])) continue;

      const points = [chain[0].from, ...chain.map((p) => p.to)];
      const legs = await getDrivingLegs(points);
      calls += 1;
      await sleep(PAUSE_MS);

      if (!legs) {
        failed += chain.length;
        console.log(`  ✗ ${chain.length}구간 실패 (${points.length}지점) — 어림값으로 남는다`);
        continue;
      }

      legs.forEach((leg, i) => {
        const key = keys[i];
        if (stored[key]) return;
        const entry: StoredLeg = {
          m: leg.distanceMeters,
          s: Math.round(leg.durationMs / 1000),
          at: new Date().toISOString(),
        };
        // 지도는 양평만 보여준다 — 서울을 오가는 구간의 경로는 저장해도 쓰이지 않는다.
        if (!isSeoul(chain[i].from) && !isSeoul(chain[i].to)) entry.p = encodePath(leg.path);
        stored[key] = entry;
        asked += 1;
      });
    }
  }

  const sorted = Object.fromEntries(Object.keys(stored).sort().map((k) => [k, stored[k]]));
  writeFileSync(
    OUTPUT,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), option: "traoptimal", legs: sorted }, null, 1)}\n`,
    "utf8",
  );

  const withPath = Object.values(sorted).filter((leg) => leg.p).length;
  const sizeKb = Math.round(readFileSync(OUTPUT).byteLength / 1024);
  console.log(
    `\n저장: ${path.relative(process.cwd(), OUTPUT)}\n` +
      `코스 ${allDays.length}개 · 고유 구간 ${seen.size}개 · 신규 ${asked}개 (이미 있던 ${before}개)\n` +
      `실패 ${failed}개 · 호출 ${calls}회 · 경로 있는 구간 ${withPath}개 · ${sizeKb}KB`,
  );
}

/** 이미 받아 둔 구간. 파일이 없거나 깨졌으면 빈 표에서 시작한다. */
function readStored(): Record<string, StoredLeg> {
  try {
    const parsed = JSON.parse(readFileSync(OUTPUT, "utf8"));
    return parsed?.legs ?? {};
  } catch {
    return {};
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
