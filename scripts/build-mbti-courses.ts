// MBTI 유형별 큐레이션 코스(src/lib/data/mbtiCourses.json)를 만든다. 실행: npm run build:mbti
//
// 원천 자료(data/mbti-courses.source.json — 근거 문서를 옮겨 적은 것)의 장소 이름을
// 실제 장소(좌표·사진·전화번호)로 바꿔 둔다. 요청마다 검색하지 않도록 오프라인에서
// 한 번 만들어 커밋한다 (PRD-01 §8 "사전 생성 코스 노출 지연 ≤ 0.5초").
//
// 장소 찾는 순서: ① 장소 스냅샷(places.json)에서 이름 일치 ② TourAPI 키워드 검색
// ③ 네이버 지역 검색 ④ 주소 Geocoding. 검색 결과는 이름이 맞는 후보만 쓴다 (검색 1위가
// 다른 업체인 경우가 실제로 있었다). 모두 실패한 장소는 좌표가 없어 지도에 못 올리므로
// 빼고 목록을 출력한다 — 원천 자료의 query나 주소를 보강한 뒤 다시 실행하면 된다.
import { loadEnvConfig } from "@next/env";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Category, Course, ItineraryDay, LodgingPick, Place } from "@/types/travel";
import { normalizeName, pickByName } from "./placeMatch";

loadEnvConfig(process.cwd());

const SOURCE = path.join(process.cwd(), "data/mbti-courses.source.json");
const OUTPUT = path.join(process.cwd(), "src/lib/data/mbtiCourses.json");

interface SourceStop {
  category: Category;
  name: string;
  // 검색에 쓸 이름 (표시 이름이 "용문산관광지·용문사"처럼 검색에 안 맞을 때)
  query?: string;
  // 읍·면까지만 있어도 된다. 검색으로 찾으면 찾은 주소를 쓰고, 못 찾을 때 Geocoding에 쓴다.
  address?: string;
  timeSlot?: string;
  reason?: string;
}

interface SourceType {
  summary?: string;
  courses?: { title: string; days: { day: number; stops: SourceStop[] }[] }[];
  lodging?: { name: string; query?: string; address?: string; lodgingType?: string; reason?: string; notice?: string }[];
}

async function main() {
  // env 로드 뒤에 import해야 모듈이 키를 읽는다.
  const { SNAPSHOT_PLACES } = await import("@/lib/data/placeSnapshot");
  const { searchNaverPlacesByKeyword } = await import("@/lib/api/naverSearch");
  const { searchTourApiByKeyword } = await import("@/lib/api/tourApi");
  const { geocodeAddress } = await import("@/lib/api/ncpMap");
  const { isMbtiType } = await import("@/lib/mbti");

  const source = JSON.parse(readFileSync(SOURCE, "utf8")) as { types: Record<string, SourceType> };
  const snapshotByName = new Map(SNAPSHOT_PLACES.map((p) => [normalizeName(p.name), p]));
  const resolved = new Map<string, Place | null>();
  const unresolved: string[] = [];

  async function resolve(
    name: string,
    query: string | undefined,
    address: string | undefined,
    category: Category,
  ): Promise<Place | null> {
    const key = `${category}:${normalizeName(name)}`;
    if (resolved.has(key)) return resolved.get(key) ?? null;

    const searchName = query ?? name;
    let place: Place | null =
      snapshotByName.get(normalizeName(name)) ?? snapshotByName.get(normalizeName(searchName)) ?? null;
    let via = "스냅샷";
    if (!place) {
      place = pickByName(await searchTourApiByKeyword(searchName, category), [name, searchName]);
      via = `TourAPI → ${place?.name} / ${place?.address}`;
    }
    if (!place) {
      place = pickByName(await searchNaverPlacesByKeyword(searchName, category), [name, searchName]);
      via = `네이버 검색 → ${place?.name} / ${place?.address}`;
    }
    if (!place && address) {
      const coords = await geocodeAddress(address);
      via = "주소 좌표";
      if (coords) {
        place = {
          placeId: `curated_${normalizeName(name)}`,
          name,
          category,
          ...coords,
          address,
          photos: [],
          mapUrl: `https://map.naver.com/p/search/${encodeURIComponent(`${name} ${address}`)}`,
          tags: [],
        };
      }
    }
    // 표시 이름·카테고리는 원천 자료를 따른다 (검색 결과 표기가 다를 수 있음).
    if (place) place = { ...place, name, category, address: place.address || address || "" };
    console.log(`  ${place ? "✓" : "✗"} ${name}${place ? ` (${via})` : ""}`);
    if (!place) unresolved.push(`${name}${address ? ` — ${address}` : ""}`);
    resolved.set(key, place);
    return place;
  }

  const types: Record<string, { summary?: string; courses: Course[]; lodging: LodgingPick[] }> = {};
  for (const [rawType, entry] of Object.entries(source.types)) {
    const type = rawType.toUpperCase();
    if (!isMbtiType(type)) {
      console.warn(`알 수 없는 MBTI 유형 "${rawType}" — 건너뜀`);
      continue;
    }
    console.log(`\n[${type}]`);

    const courses: Course[] = [];
    for (const [index, course] of (entry.courses ?? []).entries()) {
      const days: ItineraryDay[] = [];
      for (const day of course.days) {
        const stops = [];
        for (const stop of day.stops) {
          const place = await resolve(stop.name, stop.query, stop.address, stop.category);
          if (place) stops.push({ ...place, timeSlot: stop.timeSlot ?? "", reason: stop.reason });
        }
        if (stops.length > 0) days.push({ day: day.day, stops });
      }
      if (days.length === 0) continue;
      courses.push({
        // 고정 ID — 다시 빌드해도 찜 목록의 같은 코스와 겹치도록.
        courseId: `mbti_${type}_curated_${index + 1}`,
        title: course.title,
        presetType: "mbti",
        days,
        source: "curated",
      });
    }

    const lodging: LodgingPick[] = [];
    for (const pick of entry.lodging ?? []) {
      const place = await resolve(pick.name, pick.query, pick.address, "lodging");
      if (place) {
        lodging.push({ ...place, lodgingType: pick.lodgingType ?? "숙소", reason: pick.reason, notice: pick.notice });
      }
    }

    types[type] = { summary: entry.summary, courses, lodging };
    console.log(`  → 코스 ${courses.length}개, 숙소 ${lodging.length}곳`);
  }

  writeFileSync(
    OUTPUT,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), types }, null, 1)}\n`,
    "utf8",
  );
  console.log(`\n저장: ${path.relative(process.cwd(), OUTPUT)} (유형 ${Object.keys(types).length}개)`);
  if (unresolved.length > 0) {
    console.log(`\n찾지 못해 뺀 장소 ${unresolved.length}곳 — 원천 자료에 정확한 주소를 넣고 다시 실행하세요:`);
    for (const line of unresolved) console.log(`  - ${line}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
