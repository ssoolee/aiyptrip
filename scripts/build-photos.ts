// 장소 사진을 네이버 이미지 검색으로 다시 채운다. 실행: npm run build:photos
//
// build:hours와 같은 성격의 스크립트다 — LLM을 쓰지 않고 이미 커밋된 자료를 제자리에서
// 갱신하므로, 태그·요약 같은 기존 결과를 건드리지 않고 사진만 바꾼다.
//
// 두 곳을 본다.
//   ① 장소 스냅샷(src/lib/data/places.json)
//   ② MBTI 큐레이션(src/lib/data/mbtiCourses.json)의 코스 장소와 숙소
//
// ②가 따로 필요한 이유는 큐레이션이 스냅샷에 없는 장소를 가리키기 때문이다. 화면은
// 스냅샷 사진을 먼저 쓰는데(src/lib/curation.ts의 withFreshFacts), 스냅샷에 없으면
// 덮어 줄 사진이 없고 큐레이션 자체 photos도 비어 있어 그 자리가 통째로 빈다.
// 실측(2026-11): 큐레이션이 쓰는 39곳 중 23곳이 스냅샷에 없었고, 그 탓에 숙소 16곳
// 중 10곳과 코스 장소 23곳의 사진 자리가 비어 있었다(소노벨 양평 등).
// 혼자 여행 코스(soloCourses.json)는 84곳 모두 스냅샷에 있어 해당하지 않는다.
//
// 인자로 한쪽만 돌릴 수 있다. 빈 자리 몇 곳 때문에 스냅샷 177곳을 전부 다시 받으면
// 지금 멀쩡히 걸려 있는 사진까지 그때그때의 검색 결과로 바뀐다.
//   npm run build:photos              둘 다
//   npm run build:photos -- snapshot  스냅샷만
//   npm run build:photos -- curation  MBTI 큐레이션만
//   npm run build:photos -- heavy     양쪽에서 TourAPI 원본만 (아래 HEAVY_HOST)
//
// 사진 출처를 TourAPI에서 네이버 이미지 검색으로 옮긴 이유는 커버리지다. 네이버 지역
// 검색으로만 들어온 가게(카페 45곳·음식점 31곳)를 TourAPI가 모르기 때문에 그 자리가
// 비어 있었다. 판정과 크기 규칙은 src/lib/api/naverImageSearch.ts에 적어 두었다.
import { loadEnvConfig } from "@next/env";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Place } from "@/types/travel";
import { fillNaverPhotos } from "./placePhotos";

loadEnvConfig(process.cwd());

const SNAPSHOT = path.join(process.cwd(), "src/lib/data/places.json");
const MBTI = path.join(process.cwd(), "src/lib/data/mbtiCourses.json");

/**
 * 사진 검색이 이름을 못 찾는 장소의 대체 검색어.
 *
 * 이미지 검색은 사진 제목에 장소 이름이 적힌 것만 고르는데(naverImageSearch.ts),
 * 간판 이름과 글에서 쓰는 이름이 다르면 열 장 모두 걸러진다 — "델라고 풀빌라"는
 * 블로그·예약 사이트에서 "델라고 펜션"으로 불린다. 화면에 나가는 이름은 그대로
 * 두고, 찾을 때만 이 이름을 쓴다.
 */
const SEARCH_ALIAS: Record<string, string> = {
  // 글에서 부르는 이름이 간판과 다르다
  "델라고 풀빌라": "델라고 펜션",
  // 이름에 붙은 괄호·지역명·업종이 사진 제목에는 안 적힌다
  "사나사(양평)": "사나사",
  "양평 쉬자파크공원": "쉬자파크공원",
  더포레스트카페: "더포레스트",
};

/**
 * 사진이 이미 있어도 다시 받는 출처. TourAPI가 주는 주소는 940px 원본이라 한 장에
 * 0.4~0.6MB다 — 카드 커버는 340px 자리이므로 네이버 썸네일(47KB)의 열 배를 넘는다.
 * 실측(2026-11): 남아 있던 세 곳이 1,585KB였고 바꾼 뒤 80KB가 됐다. ENFP 화면은
 * 두 장이 겹쳐 혼자 1MB를 받고 있었다.
 */
const HEAVY_HOST = "tong.visitkorea.or.kr";

/**
 * 주소가 TourAPI 원본인지 본다.
 *
 * 문자열 포함으로 보면 안 된다 — 네이버 썸네일은 원본 주소를 src 파라미터에 품고 있어
 * (`search.pstatic.net/sunny/?type=a340&src=http%3A%2F%2Ftong.visitkorea...`), 이미
 * 340px로 줄여 둔 사진 24장까지 "무거운 원본"으로 잘못 걸린다. 호스트만 본다.
 */
function isHeavy(url: string | undefined): boolean {
  if (!url) return false;
  try {
    return new URL(url).host === HEAVY_HOST;
  } catch {
    return false;
  }
}

interface MbtiFile {
  generatedAt: string;
  types: Record<string, { courses?: { days: { stops: Place[] }[] }[]; lodging?: Place[] }>;
}

/**
 * 큐레이션에서 화면에 사진이 안 나오는 자리를 채운다.
 *
 * 스냅샷이 사진을 덮어 줄 자리는 건드리지 않는다 — 그쪽이 늘 더 새롭고, 두 벌을 따로
 * 들고 있으면 어긋난다. 같은 장소가 여러 유형에 있으면(소노벨 양평은 ISTJ·ESTJ,
 * 생각속의집은 INTJ·INTP) 한 번만 찾아 함께 채운다.
 */
/**
 * 이름으로 못 찾은 자리를 대체 검색어(SEARCH_ALIAS)로 한 번 더 찾는다.
 * 찾은 것이 없으면 기존 사진을 그대로 둔다.
 */
async function retryWithAlias(places: Place[]): Promise<number> {
  const { searchPlaceImage } = await import("@/lib/api/naverImageSearch");
  let filled = 0;
  for (const place of places) {
    const alias = SEARCH_ALIAS[place.name];
    if (!alias) continue;
    const image = await searchPlaceImage(alias);
    if (!image) continue;
    place.photos = [image.medium];
    filled += 1;
    console.log(`  ✓ ${place.name} — "${alias}"(으)로 다시 찾음`);
  }
  return filled;
}

async function fillCuration(snapshot: Place[]): Promise<void> {
  const covered = new Set(snapshot.filter((p) => p.photos.length > 0).map((p) => p.placeId));
  const file = JSON.parse(readFileSync(MBTI, "utf8")) as MbtiFile;

  const sameId = new Map<string, Place[]>();
  for (const entry of Object.values(file.types)) {
    const places = [
      ...(entry.courses ?? []).flatMap((course) => course.days.flatMap((day) => day.stops)),
      ...(entry.lodging ?? []),
    ];
    for (const place of places) {
      if (covered.has(place.placeId)) continue;
      const heavy = isHeavy(place.photos[0]);
      if (place.photos.length > 0 && !heavy) continue;
      const found = sameId.get(place.placeId);
      if (found) found.push(place);
      else sameId.set(place.placeId, [place]);
    }
  }

  if (sameId.size === 0) {
    console.log("MBTI 큐레이션: 받을 자리 없음");
    return;
  }

  console.log(`MBTI 큐레이션에서 사진을 받을 자리 ${sameId.size}곳 (빈 자리 + TourAPI 원본).`);
  const groups = [...sameId.values()];
  const result = await fillNaverPhotos(
    groups.map((group) => group[0]),
    { log: true },
  );
  // 같은 장소를 유형마다 다른 이름으로 들고 있는 경우가 있다 — ISTJ는 "용문산관광지·용문사",
  // ESTJ는 "용문산관광지"다. 이미지 검색은 사진 제목에 이름이 적힌 것만 고르므로
  // (naverImageSearch.ts) 가운뎃점이 붙은 쪽은 걸러진다. 첫 이름으로 못 찾으면
  // 같은 장소의 다른 이름으로도 찾아본다.
  const { searchPlaceImage } = await import("@/lib/api/naverImageSearch");
  for (const group of groups) {
    if (group[0].photos.length > 0) continue;
    const names = [...new Set(group.map((place) => place.name))];
    const alternates = [...names.slice(1), ...names.map((n) => SEARCH_ALIAS[n]).filter(Boolean)];
    for (const name of alternates) {
      const image = await searchPlaceImage(name);
      if (!image) continue;
      group[0].photos = [image.medium];
      console.log(`  ✓ ${group[0].name} — "${name}"(으)로 다시 찾음`);
      break;
    }
  }

  for (const group of groups) {
    for (const place of group.slice(1)) place.photos = group[0].photos;
  }

  writeFileSync(MBTI, `${JSON.stringify(file, null, 1)}\n`, "utf8");
  const still = groups.filter((group) => group[0].photos.length === 0);
  console.log(
    `저장: ${path.relative(process.cwd(), MBTI)} — ` +
      `새로 받음 ${result.filled}곳, 아직 사진 없음 ${still.length}곳` +
      (still.length ? ` (${still.map((g) => g[0].name).join(", ")})` : ""),
  );
}

async function main() {
  const only = process.argv[2];
  if (only && !["snapshot", "curation", "heavy"].includes(only)) {
    console.error(`인자는 snapshot·curation·heavy만 받는다 (받은 값: ${only})`);
    process.exit(1);
  }

  const snapshot = JSON.parse(readFileSync(SNAPSHOT, "utf8")) as {
    generatedAt: string;
    places: Place[];
  };

  if (only !== "curation") {
    // heavy는 TourAPI 원본만 고른다. 스냅샷 177곳을 통째로 다시 받으면 멀쩡히 걸려
    // 있는 네이버 사진까지 그때그때의 검색 결과로 바뀐다. 고를 것이 없으면
    // fillNaverPhotos가 0을 돌려주고 파일은 그대로 다시 쓰인다.
    const targets =
      only === "heavy"
        ? snapshot.places.filter((place) => isHeavy(place.photos[0]))
        : snapshot.places;
    console.log(`스냅샷에서 ${targets.length}곳의 사진을 받는다.`);
    const before = snapshot.places.filter((p) => p.photos.length > 0).length;
    const result = await fillNaverPhotos(targets, { log: true });
    // 이름이 안 맞아 못 찾은 자리는 대체 검색어로 한 번 더 — 괄호가 붙은 "사나사(양평)",
    // 지역명이 겹치는 "양평 쉬자파크공원", 업종이 붙은 "더포레스트카페"가 그랬다.
    const stillHeavy = targets.filter((place) => isHeavy(place.photos[0]));
    const retried = stillHeavy.length ? await retryWithAlias(stillHeavy) : 0;
    const after = snapshot.places.filter((p) => p.photos.length > 0).length;

    writeFileSync(SNAPSHOT, `${JSON.stringify(snapshot, null, 1)}\n`, "utf8");
    console.log(
      `저장: ${path.relative(process.cwd(), SNAPSHOT)} — ` +
        `새로 받음 ${result.filled + retried}곳, 기존 유지 ${result.kept - retried}곳, ` +
        `사진 없음 ${result.empty}곳 ` +
        `(사진 있는 곳 ${before} → ${after})`,
    );
  }

  // 스냅샷을 먼저 채운 뒤에 본다 — 방금 받은 사진이 큐레이션 자리를 덮어 줄 수도 있다.
  if (only !== "snapshot") await fillCuration(snapshot.places);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
