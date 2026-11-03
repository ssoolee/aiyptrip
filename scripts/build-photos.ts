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
// 실측(2026-11): 숙소 16곳 중 10곳, 코스 장소 23곳이 그랬다(소노벨 양평 등).
// 혼자 여행 코스(soloCourses.json)는 84곳 모두 스냅샷에 있어 해당하지 않는다.
//
// 인자로 한쪽만 돌릴 수 있다. 빈 자리 몇 곳 때문에 스냅샷 177곳을 전부 다시 받으면
// 지금 멀쩡히 걸려 있는 사진까지 그때그때의 검색 결과로 바뀐다.
//   npm run build:photos              둘 다
//   npm run build:photos -- snapshot  스냅샷만
//   npm run build:photos -- curation  MBTI 큐레이션만
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
  "델라고 풀빌라": "델라고 펜션",
};

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
      if (covered.has(place.placeId) || place.photos.length > 0) continue;
      const found = sameId.get(place.placeId);
      if (found) found.push(place);
      else sameId.set(place.placeId, [place]);
    }
  }

  if (sameId.size === 0) {
    console.log("MBTI 큐레이션: 빈 자리 없음");
    return;
  }

  console.log(`MBTI 큐레이션에서 사진이 비는 자리 ${sameId.size}곳을 채운다.`);
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
  if (only && only !== "snapshot" && only !== "curation") {
    console.error(`인자는 snapshot 또는 curation만 받는다 (받은 값: ${only})`);
    process.exit(1);
  }

  const snapshot = JSON.parse(readFileSync(SNAPSHOT, "utf8")) as {
    generatedAt: string;
    places: Place[];
  };

  if (only !== "curation") {
    console.log(`스냅샷 ${snapshot.places.length}곳의 사진을 다시 받는다.`);
    const before = snapshot.places.filter((p) => p.photos.length > 0).length;
    const result = await fillNaverPhotos(snapshot.places, { log: true });
    const after = snapshot.places.filter((p) => p.photos.length > 0).length;

    writeFileSync(SNAPSHOT, `${JSON.stringify(snapshot, null, 1)}\n`, "utf8");
    console.log(
      `저장: ${path.relative(process.cwd(), SNAPSHOT)} — ` +
        `새로 받음 ${result.filled}곳, 기존 유지 ${result.kept}곳, 사진 없음 ${result.empty}곳 ` +
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
