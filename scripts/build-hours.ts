// 영업시간과 전화번호를 채운다. 실행: npm run build:hours
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
// 그 파일의 hours만 채워 다시 실행하면 반영된다.
//
// build:photos와 같이 두 곳을 본다.
//   ① 장소 스냅샷(src/lib/data/places.json)
//   ② MBTI 큐레이션(src/lib/data/mbtiCourses.json) 중 스냅샷에 없는 장소
//
// ②가 필요한 이유는 화면이 스냅샷 값을 앞세우기 때문이다(src/lib/curation.ts의
// withFreshFacts). 큐레이션이 쓰는 39곳 중 23곳이 스냅샷에 없어 덮어 줄 값이 없고,
// 그 23곳은 영업시간도 전화번호도 비어 있었다(2026-11 실측). 스냅샷에 있는 장소는
// 건드리지 않는다 — 그쪽이 늘 더 새롭다.
//
//   npm run build:hours              둘 다
//   npm run build:hours -- snapshot  스냅샷만
//   npm run build:hours -- curation  큐레이션만
//
// 전화번호는 채우지 못한다. 네이버 지역 검색의 telephone과 TourAPI의 tel이 둘 다 빈
// 문자열로 온다(2026-11 실측 — 두 API 각각 네 곳씩 확인). 그래서 스냅샷 177곳도
// 전화번호가 0건이고, 상세 화면의 "전화하기" 버튼은 어디서도 뜨지 않는다. 다시 시도할
// 거리가 아니라는 뜻이다 — 채우려면 다른 출처를 찾아야 한다.
//
// build:places와 달리 LLM을 쓰지 않고 이미 커밋된 자료를 제자리에서 갱신하므로,
// 태그·요약 등 기존 큐레이션 결과를 건드리지 않고 영업시간만 다시 받아올 수 있다.
// (build:places로 전체를 다시 만들 때도 1·2 없이 TourAPI 영업시간이 함께 채워진다.)
import { loadEnvConfig } from "@next/env";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Category, Place } from "@/types/travel";
import { conflictingAddress, normalizeName, pickByName } from "./placeMatch";

loadEnvConfig(process.cwd());

const SNAPSHOT = path.join(process.cwd(), "src/lib/data/places.json");
const MBTI = path.join(process.cwd(), "src/lib/data/mbtiCourses.json");
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

interface MbtiFile {
  generatedAt: string;
  types: Record<string, { courses?: { days: { stops: Place[] }[] }[]; lodging?: Place[] }>;
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

/** 한 장소에서 받아 온 것. */
interface Resolved {
  hours?: string;
  from: "manual" | "tour" | "keyword" | "none";
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

/**
 * 큐레이션에서 스냅샷이 덮어 주지 못하는 장소에 영업시간·전화번호를 채운다.
 *
 * 숙소는 영업시간을 받지 않지만 전화번호는 받는다 — 숙소 카드에 "전화하기" 버튼이 있다.
 * 같은 장소가 여러 유형에 있으면 한 번만 찾아 함께 채운다.
 */
async function fillCuration(
  snapshot: Place[],
  resolve: (place: Place) => Promise<Resolved>,
  canParse: (raw: string) => boolean,
  resolved: Set<string>,
): Promise<Place[]> {
  const covered = new Set(snapshot.map((p) => p.placeId));
  const file = JSON.parse(readFileSync(MBTI, "utf8")) as MbtiFile;

  const sameId = new Map<string, Place[]>();
  for (const entry of Object.values(file.types)) {
    const places = [
      ...(entry.courses ?? []).flatMap((course) => course.days.flatMap((day) => day.stops)),
      ...(entry.lodging ?? []),
    ];
    for (const place of places) {
      if (covered.has(place.placeId)) continue;
      const found = sameId.get(place.placeId);
      if (found) found.push(place);
      else sameId.set(place.placeId, [place]);
    }
  }

  if (sameId.size === 0) {
    console.log("큐레이션: 스냅샷이 모두 덮어 준다 — 받을 자리 없음");
    return [];
  }

  console.log(`\n큐레이션에서 스냅샷이 못 덮는 ${sameId.size}곳을 받는다.`);
  const groups = [...sameId.values()];
  const missing: Place[] = [];
  let hours = 0;

  for (const group of groups) {
    const head = group[0];
    const lodging = head.category === "lodging";
    // 숙소는 영업시간 개념이 없어 아예 부르지 않는다.
    const got = lodging ? { from: "none" as const } : await resolve(head);
    if (lodging) {
      console.log(`  · ${head.name} — 숙소라 건너뜀`);
    } else if (got.hours) {
      head.businessHoursRaw = got.hours;
      resolved.add(normalizeName(head.name));
      hours += 1;
      const note = canParse(got.hours) ? "" : "  (요일별 해석 실패 — 원문 그대로 노출)";
      console.log(`  ✓ ${head.name} — ${got.hours}${note}`);
    } else {
      missing.push(head);
      console.log(`  - ${head.name} — 영업시간 못 찾음`);
    }

    for (const place of group.slice(1)) {
      if (head.businessHoursRaw) place.businessHoursRaw = head.businessHoursRaw;
    }
  }

  writeFileSync(MBTI, `${JSON.stringify(file, null, 1)}\n`, "utf8");
  console.log(`저장: ${path.relative(process.cwd(), MBTI)} — 영업시간 ${hours}곳`);
  return missing;
}

async function main() {
  const only = process.argv[2];
  if (only && only !== "snapshot" && only !== "curation") {
    console.error(`인자는 snapshot 또는 curation만 받는다 (받은 값: ${only})`);
    process.exit(1);
  }

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

  const manual = loadManualSource();
  // 이름으로 찾는다 — naver_ placeId는 좌표에서 만들어져 사람이 알아보기 어렵다.
  const manualByName = new Map(
    manual.places.filter((e) => e.hours.trim()).map((e) => [normalizeName(e.name), e]),
  );

  /**
   * 한 장소의 영업시간(과 있으면 전화번호)을 찾는다. 머리말의 1·2·3을 그대로 따른다.
   * 스냅샷과 큐레이션이 같은 규칙을 쓰도록 한 군데에 모아 두었다.
   */
  async function resolve(place: Place): Promise<Resolved> {
    const manualEntry = manualByName.get(normalizeName(place.name));
    const manualHours = manualEntry?.hours.trim();
    if (manualHours) return { hours: manualHours, from: "manual" };

    if (place.placeId.startsWith(TOUR_PREFIX)) {
      const hours = await fetchHours(place.placeId.slice(TOUR_PREFIX.length), place.category);
      return { hours, from: hours ? "tour" : "none" };
    }

    // 네이버 출처 장소 — 같은 업체가 TourAPI에 있는지 이름으로 찾아본다.
    const candidates = await searchTourApiByKeyword(place.name, place.category);
    const near = candidates.filter((c) => distanceKm(place, c) <= MATCH_RADIUS_KM);
    const matched = pickByName(near, [place.name]);
    if (!matched) return { from: "none" };
    // 이름이 비슷한 옆 가게를 거르는 마지막 관문. 거리(2km)와 이름만으로는
    // "광이원"(용문산로 120-11)과 "광이원 보배밥"(120-13)을 가려낼 수 없다.
    if (conflictingAddress(place.address, matched.address)) return { from: "none" };

    const hours = await fetchHours(matched.placeId.slice(TOUR_PREFIX.length), place.category);
    return { hours, from: hours ? "keyword" : "none" };
  }

  const snapshot: Snapshot = JSON.parse(readFileSync(SNAPSHOT, "utf8"));
  const missing: Place[] = [];
  // 이번 실행에서 영업시간을 받아 낸 장소. 아래에서 "확인 필요" 빈 항목을 치우는 데 쓴다.
  const resolved = new Set<string>();

  if (only !== "curation") {
    // 숙소는 영업시간 개념이 없다 (TourAPI도 체크인/체크아웃 시각만 준다).
    const targets = snapshot.places.filter((p) => p.category !== "lodging");
    console.log(`스냅샷 대상 ${targets.length}곳 (전체 ${snapshot.places.length}곳 중 숙소 제외)`);

    const count = { manual: 0, tour: 0, keyword: 0, none: 0 };
    let parsed = 0;
    const unparsed: string[] = [];

    for (const place of targets) {
      const got = await resolve(place);
      if (!got.hours) {
        // 두 번 물어도 비어 있으면 이전 실행에서 받아 둔 값도 지운다 — 원본이 바뀐 것이다.
        delete place.businessHoursRaw;
        missing.push(place);
        continue;
      }
      count[got.from] += 1;
      place.businessHoursRaw = got.hours;
      resolved.add(normalizeName(place.name));
      // 저장은 하되, 요일별 표로 못 옮긴 표기는 눈에 보이게 남긴다.
      if (parseBusinessHours(got.hours)) parsed += 1;
      else unparsed.push(`${place.name}: ${got.hours}`);
    }

    const filled = count.manual + count.tour + count.keyword;
    console.log(
      `영업시간 저장 ${filled}/${targets.length}곳 ` +
        `(손으로 확인 ${count.manual}, TourAPI ${count.tour}, 이름 매칭 ${count.keyword}), ` +
        `그중 요일별 해석 성공 ${parsed}곳`,
    );
    if (unparsed.length > 0) {
      console.log(`해석 못 한 표기 ${unparsed.length}건 (원문 그대로 노출됨):`);
      for (const line of unparsed) console.log(`  - ${line}`);
    }

    writeFileSync(SNAPSHOT, `${JSON.stringify(snapshot, null, 1)}\n`, "utf8");
    console.log(`저장: ${path.relative(process.cwd(), SNAPSHOT)}`);
  }

  if (only !== "snapshot") {
    const stillMissing = await fillCuration(
      snapshot.places,
      resolve,
      (raw) => Boolean(parseBusinessHours(raw)),
      resolved,
    );
    missing.push(...stillMissing);
  }

  // 못 채운 장소를 손으로 채울 수 있게 빈 항목으로 적어 둔다. 사람이 채워 둔
  // 항목은 스냅샷에서 빠진 장소라도 지우지 않는다 — 다시 등장할 수 있다.
  const entries = new Map(manual.places.map((e) => [normalizeName(e.name), e]));
  for (const place of missing) {
    const key = normalizeName(place.name);
    if (entries.has(key)) continue;
    entries.set(key, { name: place.name, category: place.category, hours: "", source: "", checkedAt: "" });
  }
  // 이번에 API로 채운 곳의 빈 "확인 필요" 항목은 치운다. 사람이 적어 둔 값(hours가
  // 채워진 항목)은 그대로 둔다 — TourAPI 값보다 우선하는 쪽이라 덮으면 안 된다.
  // 치우지 않으면 한 번 실패했던 장소가 영영 할 일 목록에 남는다.
  for (const [key, entry] of entries) {
    if (!entry.hours.trim() && resolved.has(key)) entries.delete(key);
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
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
