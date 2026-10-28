// 장소 스냅샷(src/lib/data/places.json)에 영업시간을 채운다. 실행: npm run build:hours
//
// PRD-03 "오늘 방문 가능한지(영업시간/휴무일) 바로 확인" 요구사항의 데이터 공급원.
// 영업시간은 세 곳에서 온다 — 뒤로 갈수록 우선순위가 높다.
//   1. TourAPI detailIntro2 — placeId가 tour_인 장소는 contentId로 바로 조회한다.
//   2. TourAPI 키워드 검색 — naver_ 장소(네이버 지역 검색은 영업시간을 주지 않는다)도
//      같은 업체가 TourAPI에 있으면 영업시간을 받아올 수 있다. 이름이 맞고 좌표가
//      가까운(MATCH_RADIUS_KM) 후보만 같은 곳으로 인정한다.
//   3. data/hours.source.json — 손으로 적어 둔 영업시간. 어느 API에도 없는 업체가
//      많아(네이버 지역 검색 출처 카페·음식점) 사람이 확인해 채우는 통로를 둔다.
//
// 실행 끝에 2까지로도 못 채운 장소를 data/hours.source.json에 빈 항목으로 적어 둔다.
// 그 파일의 hours만 채워 다시 실행하면 스냅샷에 반영된다.
//
// build:places와 달리 LLM을 쓰지 않고 이미 커밋된 스냅샷을 제자리에서 갱신하므로,
// 태그·요약 등 기존 큐레이션 결과를 건드리지 않고 영업시간만 다시 받아올 수 있다.
// (build:places로 전체를 다시 만들 때도 1·2 없이 TourAPI 영업시간이 함께 채워진다.)
import { loadEnvConfig } from "@next/env";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Category, Place } from "@/types/travel";
import { normalizeName, pickByName } from "./placeMatch";

loadEnvConfig(process.cwd());

const SNAPSHOT = path.join(process.cwd(), "src/lib/data/places.json");
const MANUAL_SOURCE = path.join(process.cwd(), "data/hours.source.json");
const TOUR_PREFIX = "tour_";

// 이름이 같아도 이만큼 떨어져 있으면 다른 업체로 본다 (양평군은 가로 약 30km).
const MATCH_RADIUS_KM = 2;

const MANUAL_NOTE =
  "손으로 확인한 영업시간. hours를 채우고 npm run build:hours를 다시 실행하면 " +
  "src/lib/data/places.json에 반영된다 (TourAPI 값보다 우선). 비어 있는 항목은 " +
  "스크립트가 자동으로 적어 둔 '확인 필요' 목록이다.";
const MANUAL_FORMAT = '"09:00~18:00 / 휴무: 매주 수요일" — 해석 규칙은 src/lib/businessHours.ts';

interface Snapshot {
  generatedAt: string;
  places: Place[];
}

interface ManualEntry {
  name: string;
  category: Category;
  /** 영업시간 원문. 빈 문자열이면 아직 확인 못 한 장소. */
  hours: string;
  /** 어디서 확인했는지 (네이버 지도, 전화 확인 등) */
  source?: string;
  /** 확인한 날짜 (YYYY-MM-DD) */
  checkedAt?: string;
}

interface ManualSource {
  note: string;
  format: string;
  places: ManualEntry[];
}

function loadManualSource(): ManualSource {
  if (!existsSync(MANUAL_SOURCE)) {
    return { note: MANUAL_NOTE, format: MANUAL_FORMAT, places: [] };
  }
  const parsed = JSON.parse(readFileSync(MANUAL_SOURCE, "utf8")) as Partial<ManualSource>;
  return {
    note: MANUAL_NOTE,
    format: MANUAL_FORMAT,
    places: Array.isArray(parsed.places) ? parsed.places : [],
  };
}

async function main() {
  // env 로드 뒤에 import해야 모듈이 키를 읽는다.
  const { getTourApiBusinessHours, searchTourApiByKeyword } = await import("@/lib/api/tourApi");
  const { parseBusinessHours } = await import("@/lib/businessHours");
  const { distanceKm } = await import("@/lib/geo");

  // TourAPI 호출은 실패와 "자료 없음"을 구분해 주지 않는다(src/lib/api/tourApi.ts는
  // 둘 다 빈 값). 한 번 비었다고 바로 지우면 일시적인 오류에 이미 모아 둔 영업시간이
  // 날아가므로, 비었을 때만 한 번 더 물어본다.
  const fetchHours = async (contentId: string, category: Category) => {
    const first = await getTourApiBusinessHours(contentId, category);
    if (first) return first;
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    return getTourApiBusinessHours(contentId, category);
  };

  const snapshot: Snapshot = JSON.parse(readFileSync(SNAPSHOT, "utf8"));
  const manual = loadManualSource();
  // 이름으로 찾는다 — naver_ placeId는 좌표에서 만들어져 사람이 알아보기 어렵다.
  const manualByName = new Map(
    manual.places.filter((e) => e.hours.trim()).map((e) => [normalizeName(e.name), e]),
  );

  // 숙소는 영업시간 개념이 없다 (TourAPI도 체크인/체크아웃 시각만 준다).
  const targets = snapshot.places.filter((p) => p.category !== "lodging");
  console.log(`대상 ${targets.length}곳 (전체 ${snapshot.places.length}곳 중 숙소 제외)`);

  let fromManual = 0;
  let fromTourApi = 0;
  let fromKeyword = 0;
  let parsed = 0;
  const unparsed: string[] = [];
  const missing: Place[] = [];

  for (const place of targets) {
    const manualEntry = manualByName.get(normalizeName(place.name));
    let raw = manualEntry?.hours.trim();
    if (raw) {
      fromManual += 1;
    } else if (place.placeId.startsWith(TOUR_PREFIX)) {
      raw = await fetchHours(place.placeId.slice(TOUR_PREFIX.length), place.category);
      if (raw) fromTourApi += 1;
    } else {
      // 네이버 출처 장소 — 같은 업체가 TourAPI에 있는지 이름으로 찾아본다.
      const candidates = await searchTourApiByKeyword(place.name, place.category);
      const near = candidates.filter((c) => distanceKm(place, c) <= MATCH_RADIUS_KM);
      const matched = pickByName(near, [place.name]);
      if (matched) {
        raw = await fetchHours(matched.placeId.slice(TOUR_PREFIX.length), place.category);
        if (raw) fromKeyword += 1;
      }
    }

    if (!raw) {
      // 두 번 물어도 비어 있으면 이전 실행에서 받아 둔 값도 지운다 — 원본이 바뀐 것이다.
      delete place.businessHoursRaw;
      missing.push(place);
      continue;
    }

    place.businessHoursRaw = raw;
    // 저장은 하되, 요일별 표로 못 옮긴 표기는 눈에 보이게 남긴다.
    if (parseBusinessHours(raw)) parsed += 1;
    else unparsed.push(`${place.name}: ${raw}`);
  }

  const filled = fromManual + fromTourApi + fromKeyword;
  console.log(
    `영업시간 저장 ${filled}/${targets.length}곳 ` +
      `(손으로 확인 ${fromManual}, TourAPI ${fromTourApi}, 이름 매칭 ${fromKeyword}), ` +
      `그중 요일별 해석 성공 ${parsed}곳`,
  );
  if (unparsed.length > 0) {
    console.log(`해석 못 한 표기 ${unparsed.length}건 (원문 그대로 노출됨):`);
    for (const line of unparsed) console.log(`  - ${line}`);
  }

  // 못 채운 장소를 손으로 채울 수 있게 빈 항목으로 적어 둔다. 사람이 채워 둔
  // 항목은 스냅샷에서 빠진 장소라도 지우지 않는다 — 다시 등장할 수 있다.
  const entries = new Map(manual.places.map((e) => [normalizeName(e.name), e]));
  for (const place of missing) {
    const key = normalizeName(place.name);
    if (entries.has(key)) continue;
    entries.set(key, { name: place.name, category: place.category, hours: "", source: "", checkedAt: "" });
  }
  const sorted = [...entries.values()].sort(
    (a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name, "ko"),
  );
  const next: ManualSource = { note: MANUAL_NOTE, format: MANUAL_FORMAT, places: sorted };
  writeFileSync(MANUAL_SOURCE, `${JSON.stringify(next, null, 1)}\n`, "utf8");
  const todo = sorted.filter((e) => !e.hours.trim()).length;
  console.log(
    `영업시간 미확인 ${missing.length}곳 — ${path.relative(process.cwd(), MANUAL_SOURCE)}에 ` +
      `빈 항목 ${todo}건 (hours를 채우고 다시 실행)`,
  );

  writeFileSync(SNAPSHOT, `${JSON.stringify(snapshot, null, 1)}\n`, "utf8");
  console.log(`저장: ${path.relative(process.cwd(), SNAPSHOT)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
