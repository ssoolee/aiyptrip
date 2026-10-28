// 실제 장소 스냅샷(src/lib/data/places.json)을 만든다. 실행: npm run build:places
//
// docs/agents/02-place-retrieval-agent.md의 "자체 캐시 DB" 역할. 네이버 지역 검색과
// TourAPI에서 양평 장소를 모으고, LLM으로 취향 태그(src/lib/placeTags.ts)·반려동물
// 동반 여부·한 줄 요약을 붙인다. 요청마다 태깅하면 LLM 무료 한도(분당 15회)와
// 응답 시간을 잡아먹으므로 오프라인에서 한 번 만들어 커밋하고, 주기적으로 갱신한다.
import { loadEnvConfig } from "@next/env";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import type { Category, Place } from "@/types/travel";

loadEnvConfig(process.cwd());

const OUTPUT = path.join(process.cwd(), "src/lib/data/places.json");
const TOUR_POOL_SIZE = 40;
const BATCH_SIZE = 12;
const CATEGORIES: Category[] = ["attraction", "cafe", "restaurant", "lodging"];

// 반려동물 동반은 LLM 판단만 믿지 않고, 원문(소개글·업종)에 명시된 경우만 인정한다.
const PET_EVIDENCE = /반려동물|반려견|애견|펫|pet/i;

function normalizeName(name: string): string {
  return name.replace(/\s+/g, "").toLowerCase();
}

interface TagEntry {
  tags?: unknown;
  petFriendly?: unknown;
  summary?: unknown;
}

function normalizeResult(raw: unknown): Record<string, TagEntry> | null {
  if (Array.isArray(raw)) return Object.assign({}, ...raw.filter((v) => v && typeof v === "object"));
  if (raw && typeof raw === "object") return raw as Record<string, TagEntry>;
  return null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  // env 로드 뒤에 import해야 모듈이 키를 읽는다.
  const { searchNaverPlaces } = await import("@/lib/api/naverSearch");
  const { searchTourApiPlaces, getTourApiOverview, getTourApiBusinessHours } = await import("@/lib/api/tourApi");
  const { generateJson } = await import("@/lib/llm");
  const { PLACE_TAGS, isPlaceTag } = await import("@/lib/placeTags");

  // 1. 수집 — 음식점/카페는 네이버 우선, 같은 이름은 먼저 들어온 쪽을 남긴다.
  // 네이버 장소와 같은 곳이 TourAPI에도 있으면 TourAPI의 사진·소개글을 합친다
  // (네이버 검색은 사진·소개글이 없음 — 예: 플로라늘카페의 반려동물 동반 정보).
  const places: Place[] = [];
  const byName = new Map<string, Place>();
  const tourContentIds = new Map<string, string>(); // placeId → 소개글을 가져올 TourAPI contentId
  for (const category of CATEGORIES) {
    const [naver, tour] = await Promise.all([
      searchNaverPlaces(category),
      searchTourApiPlaces({ category, count: TOUR_POOL_SIZE }),
    ]);
    let added = 0;
    let merged = 0;
    for (const place of [...naver, ...tour]) {
      const name = normalizeName(place.name);
      const existing = byName.get(name);
      const contentId = place.placeId.startsWith("tour_") ? place.placeId.slice("tour_".length) : undefined;
      if (existing) {
        if (contentId && !tourContentIds.has(existing.placeId)) {
          tourContentIds.set(existing.placeId, contentId);
          if (existing.photos.length === 0) existing.photos = place.photos;
          existing.phone ??= place.phone;
          merged++;
        }
        continue;
      }
      byName.set(name, place);
      places.push(place);
      if (contentId) tourContentIds.set(place.placeId, contentId);
      added++;
    }
    console.log(`${category}: 네이버 ${naver.length}, TourAPI ${tour.length} → ${added}곳 (중복 병합 ${merged})`);
  }

  // 2. TourAPI 장소 소개글(태깅·요약 근거)과 영업시간
  // 네이버 장소라도 TourAPI에 같은 곳이 있으면(위에서 contentId를 합쳐 둔다) 영업시간을
  // 받아올 수 있다. 영업시간만 다시 받고 싶을 때는 npm run build:hours.
  const byId = new Map(places.map((p) => [p.placeId, p]));
  const overviews = new Map<string, string>();
  let hoursFilled = 0;
  for (const [placeId, contentId] of tourContentIds) {
    const place = byId.get(placeId);
    const [overview, hours] = await Promise.all([
      getTourApiOverview(contentId),
      place ? getTourApiBusinessHours(contentId, place.category) : undefined,
    ]);
    if (overview) overviews.set(placeId, overview);
    if (place && hours) {
      place.businessHoursRaw = hours;
      hoursFilled += 1;
    }
  }
  console.log(`소개글 ${overviews.size}건, 영업시간 ${hoursFilled}건`);

  // 3. LLM 태깅 (배치)
  const vocabulary = Object.entries(PLACE_TAGS)
    .map(([tag, description]) => `- ${tag}: ${description}`)
    .join("\n");
  const system =
    "당신은 경기도 양평군 여행지 큐레이터입니다. 장소마다 주어진 근거(이름, 분류, 업종, 소개글)만 보고 " +
    "취향 태그를 고릅니다. 근거가 부족하면 태그를 비워 두세요 — 추측으로 붙이는 것보다 비우는 것이 낫습니다.\n\n" +
    `사용 가능한 태그:\n${vocabulary}`;

  for (let start = 0; start < places.length; start += BATCH_SIZE) {
    const batch = places.slice(start, start + BATCH_SIZE);
    const lines = batch.map((p, i) => {
      const overview = overviews.get(p.placeId);
      return (
        `[k${i + 1}] ${p.name} (분류: ${p.category}${p.categoryLabel ? `, 업종: ${p.categoryLabel}` : ""})` +
        (overview ? `\n소개글: ${overview.slice(0, 500)}` : "")
      );
    });
    const prompt =
      `${lines.join("\n\n")}\n\n` +
      `각 장소에 대해 {"k1": {"tags": [...], "petFriendly": false, "summary": "..."}, ...} 형식으로 답하세요.\n` +
      `- tags: 위 목록의 태그만, 최대 4개\n` +
      `- petFriendly: 소개글이나 업종에 반려동물 동반 가능이 명시된 경우에만 true\n` +
      `- summary: 소개글이 있는 장소만, 여행자 관점에서 40자 안팎 한 문장 (소개글에 없는 사실 금지). 소개글이 없으면 빈 문자열`;

    // 응답 형식이 가끔 달라(배열로 감싸기 등) 키가 안 맞으면 조용히 전부 비는
    // 문제가 실제로 있었다 — 정규화하고, 절반 이상 매칭되지 않으면 실패로 보고 재시도.
    let result: Record<string, TagEntry> | null = null;
    for (let attempt = 1; attempt <= 4 && !result; attempt++) {
      const raw = await generateJson<unknown>({ system, prompt, maxTokens: 4096, timeoutMs: 60_000 });
      const normalized = normalizeResult(raw);
      const matched = batch.filter((_, i) => normalized?.[`k${i + 1}`]).length;
      if (normalized && matched >= batch.length / 2) {
        result = normalized;
      } else {
        console.log(`  배치 ${start / BATCH_SIZE + 1} 실패(매칭 ${matched}/${batch.length}) — 35초 뒤 재시도 (${attempt}/4)`);
        await sleep(35_000);
      }
    }
    if (!result) console.log(`  배치 ${start / BATCH_SIZE + 1} 포기 — 태그 없이 저장`);

    batch.forEach((place, i) => {
      const entry = result?.[`k${i + 1}`];
      if (!entry) return;
      const tags = Array.isArray(entry.tags) ? entry.tags.filter((t): t is string => typeof t === "string") : [];
      place.tags = [...new Set(tags.filter(isPlaceTag))].slice(0, 4);
      const evidence = `${overviews.get(place.placeId) ?? ""} ${place.categoryLabel ?? ""}`;
      if (entry.petFriendly === true && PET_EVIDENCE.test(evidence)) place.petFriendly = true;
      const summary = typeof entry.summary === "string" ? entry.summary.trim() : "";
      if (summary && summary.length <= 80 && overviews.has(place.placeId)) place.reviewSummary = summary;
    });
    console.log(`  태깅 ${Math.min(start + BATCH_SIZE, places.length)}/${places.length}`);
    // 무료 등급 분당 15회 한도 여유 확보
    await sleep(4_500);
  }

  const tagged = places.filter((p) => p.tags.length > 0).length;
  const pet = places.filter((p) => p.petFriendly).map((p) => p.name);
  console.log(`태그 있음 ${tagged}/${places.length}, 반려동물 동반 ${pet.length}곳: ${pet.join(", ")}`);

  mkdirSync(path.dirname(OUTPUT), { recursive: true });
  writeFileSync(
    OUTPUT,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), places }, null, 1)}\n`,
    "utf8",
  );
  console.log(`저장: ${path.relative(process.cwd(), OUTPUT)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
