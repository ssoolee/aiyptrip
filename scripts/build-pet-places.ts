// 반려동물 동반 가능 업소(src/lib/data/petPlaces.json)를 만든다. 실행: npm run build:pet
//
// 원천 자료(data/pet-friendly.source.json — 공개된 "반려동물 동반 가능 업소 현황"에서
// 양평군만 뽑은 것)의 업소를 실제 장소로 바꾼다. 장소 스냅샷에 이미 있는 곳은 ID만
// 기록해 반려동물 동반으로 표시하고, 없는 곳은 네이버 지역 검색 결과를 새 장소로 담는다.
// 스냅샷(npm run build:places)을 다시 만들어도 이 목록은 src/lib/data/placeSnapshot.ts가
// 합치므로 유지된다.
import { loadEnvConfig } from "@next/env";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Place } from "@/types/travel";
import { normalizeName, pickByName } from "./placeMatch";

loadEnvConfig(process.cwd());

const SOURCE = path.join(process.cwd(), "data/pet-friendly.source.json");
const OUTPUT = path.join(process.cwd(), "src/lib/data/petPlaces.json");

interface SourceEntry {
  name: string;
  businessTypes: string[];
  address: string;
}

// "경기도 양평군 서종면 황순원로 455-1(1-2층)" → "황순원로455-1". 같은 이름의 다른 지점이나
// 이름만 비슷한 다른 곳을 걸러내려고 도로명+건물번호가 같은지 본다.
function roadKey(address: string): string | null {
  const match = address.replace(/\(.*$/, "").match(/([가-힣\d]+(?:로|길)(?:\d+번?길)?)\s*(\d+(?:-\d+)?)/);
  return match ? `${match[1]}${match[2]}` : null;
}

// 등록명이 네이버 상호와 다른 경우가 많다: "원더팜(원더디저트)", "바베큐(BBQ)레이브",
// "큰골시골칼국수 닭칼국수손만두". 원래 이름 → 괄호 밖 → 괄호 안 → 첫 단어 순으로 검색한다.
function nameVariants(name: string): string[] {
  const outside = name.replace(/\(.*?\)/g, "").trim();
  const inside = [...name.matchAll(/\((.*?)\)/g)].map((m) => m[1].trim());
  const firstWord = outside.split(/\s+/)[0];
  return [...new Set([name, outside, ...inside, firstWord])].filter((v) => v.length >= 2);
}

async function main() {
  // env 로드 뒤에 import해야 모듈이 키를 읽는다.
  const { searchNaverPlacesByKeyword } = await import("@/lib/api/naverSearch");
  // 합치기 전의 원본 스냅샷과 비교해야 한다 (placeSnapshot.ts는 이 스크립트의 결과를 합친 목록).
  const snapshot = (await import("@/lib/data/places.json")).default.places as Place[];

  const source = JSON.parse(readFileSync(SOURCE, "utf8")) as { source: { title: string }; places: SourceEntry[] };
  const snapshotByName = new Map(snapshot.map((p) => [normalizeName(p.name), p]));
  const snapshotIds = new Set(snapshot.map((p) => p.placeId));

  const petFriendlyIds: string[] = [];
  const places: Place[] = [];
  const unresolved: string[] = [];

  for (const entry of source.places) {
    const inSnapshot = snapshotByName.get(normalizeName(entry.name));
    if (inSnapshot) {
      petFriendlyIds.push(inSnapshot.placeId);
      console.log(`  ✓ ${entry.name} (스냅샷)`);
      continue;
    }

    const expectedRoad = roadKey(entry.address);
    let found: Place | null = null;
    for (const query of nameVariants(entry.name)) {
      const candidates = (await searchNaverPlacesByKeyword(query, "restaurant")).filter((p) => {
        // 도로명 주소가 없는 결과(예: "개나리" 검색의 "개나리고개" — 지명)는 같은 업소인지 알 수 없어 뺀다.
        return !expectedRoad || roadKey(p.address) === expectedRoad;
      });
      found = pickByName(candidates, [query]);
      if (found) break;
    }
    if (!found) {
      console.log(`  ✗ ${entry.name}`);
      unresolved.push(`${entry.name} — ${entry.address}`);
      continue;
    }
    // 네이버 장소 ID는 좌표로 만들므로, 이름이 달라도 스냅샷의 같은 업체면 ID가 같다.
    if (snapshotIds.has(found.placeId)) {
      petFriendlyIds.push(found.placeId);
      console.log(`  ✓ ${entry.name} (스냅샷, 이름 다름: ${found.name})`);
      continue;
    }

    const isCafe =
      entry.businessTypes.includes("제과점영업") || /카페|디저트|베이커리|제과|커피/.test(found.categoryLabel ?? "");
    places.push({
      ...found,
      category: isCafe ? "cafe" : "restaurant",
      petFriendly: true,
      reviewSummary: "반려동물 동반 가능 업소 현황에 등록된 곳이에요.",
    });
    console.log(`  ✓ ${entry.name} (네이버 검색 → ${found.name} / ${found.categoryLabel ?? ""} / ${found.address})`);
  }

  writeFileSync(
    OUTPUT,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), source: source.source.title, petFriendlyIds, places }, null, 1)}\n`,
    "utf8",
  );
  console.log(
    `\n저장: ${path.relative(process.cwd(), OUTPUT)} (스냅샷 표시 ${petFriendlyIds.length}곳, 새 장소 ${places.length}곳)`,
  );
  if (unresolved.length > 0) {
    console.log(`\n찾지 못해 뺀 업소 ${unresolved.length}곳:`);
    for (const line of unresolved) console.log(`  - ${line}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
