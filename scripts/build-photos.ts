// 장소 스냅샷(src/lib/data/places.json)의 사진을 네이버 이미지 검색으로 다시 채운다.
// 실행: npm run build:photos
//
// build:hours와 같은 성격의 스크립트다 — LLM을 쓰지 않고 이미 커밋된 스냅샷을 제자리에서
// 갱신하므로, 태그·요약 같은 기존 결과를 건드리지 않고 사진만 바꾼다.
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

async function main() {
  const snapshot = JSON.parse(readFileSync(SNAPSHOT, "utf8")) as {
    generatedAt: string;
    places: Place[];
  };
  console.log(`스냅샷 ${snapshot.places.length}곳의 사진을 다시 받는다.\n`);

  const before = snapshot.places.filter((p) => p.photos.length > 0).length;
  const result = await fillNaverPhotos(snapshot.places, { log: true });
  const after = snapshot.places.filter((p) => p.photos.length > 0).length;

  writeFileSync(SNAPSHOT, `${JSON.stringify(snapshot, null, 1)}\n`, "utf8");
  console.log(
    `\n저장: ${path.relative(process.cwd(), SNAPSHOT)} — ` +
      `새로 받음 ${result.filled}곳, 기존 유지 ${result.kept}곳, 사진 없음 ${result.empty}곳 ` +
      `(사진 있는 곳 ${before} → ${after})`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
