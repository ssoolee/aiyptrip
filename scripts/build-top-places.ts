// 홈의 "요즘 이야기가 많은 곳"에 올릴 식당·카페를 골라 src/lib/data/topPlaces.json에
// 담는다. 실행: npm run build:top
//
// 두 가지 순위를 만든다.
//   ① 전체 기간 — "양평 추천 맛집/카페" 지역 검색 결과를 블로그 글 총수로 다시 줄 세운다.
//   ② 최근 한 달 — 스냅샷의 카페·맛집 전체를 훑어 최근 RECENT_DAYS일에 올라온 글이
//      많은 순으로 줄 세운다. 전체 기간 합계는 오래된 유명세가 쌓인 값이라 "요즘"을
//      말해 주지 않는다. 후보를 추천 검색 결과(열 곳 남짓)로 좁히면 이미 유명한 곳만
//      다시 나오므로, 이쪽은 스냅샷 전체를 본다.
//
// 네이버는 플레이스의 방문자 리뷰 수·별점을 공개 API로 주지 않는다. 지역 검색은
// sort=comment로 "리뷰 많은 순" 정렬만 해 주고 개수는 안 준다. 그래서 순위는
// 공개 API로 셀 수 있는 블로그 글 수(naverBlogSearch의 total)로 매긴다 —
// 화면에도 "블로그 리뷰 N건"으로 그대로 적어 무엇을 센 값인지 숨기지 않는다.
//
// 사진은 지역 검색이 주지 않으므로 ① 장소 스냅샷 ② TourAPI 키워드 검색에서 가져온다.
import { loadEnvConfig } from "@next/env";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Category, Place, TopPlace } from "@/types/travel";
import { normalizeName } from "./placeMatch";

loadEnvConfig(process.cwd());

const OUTPUT = path.join(process.cwd(), "src/lib/data/topPlaces.json");
const PICK_COUNT = 3;
/** "요즘"의 기준. 화면에도 이 수를 그대로 적는다. */
const RECENT_DAYS = 30;

/** 지금 파일에 적힌 내용(generatedAt 뺀 나머지)을 같은 순서로 직렬화한 것. 없으면 null. */
function previousPayload(): string | null {
  const old = readPrevious();
  if (!old) return null;
  const rest = { ...old };
  delete rest.generatedAt;
  return JSON.stringify(rest);
}

function previousGeneratedAt(): string | null {
  return (readPrevious()?.generatedAt as string | undefined) ?? null;
}

function readPrevious(): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(OUTPUT, "utf8")) as Record<string, unknown>;
  } catch {
    // 파일이 없거나 깨졌으면 새로 쓴다.
    return null;
  }
}

async function main() {
  // env 로드 뒤에 import해야 모듈이 키를 읽는다.
  const { searchNaverRecommended } = await import("@/lib/api/naverSearch");
  const { searchBlogReviews, countRecentBlogPosts, canCountRecentPosts } = await import(
    "@/lib/api/naverBlogSearch",
  );
  const { searchPlaceImage } = await import("@/lib/api/naverImageSearch");
  const { SNAPSHOT_PLACES } = await import("@/lib/data/placeSnapshot");

  const snapshotById = new Map(SNAPSHOT_PLACES.map((p) => [p.placeId, p]));
  const snapshotByName = new Map(SNAPSHOT_PLACES.map((p) => [normalizeName(p.name), p]));

  /**
   * 지역 검색에는 사진이 없다. 네이버 이미지 검색에서 받고, 못 찾으면 스냅샷에 있는
   * 사진을 쓴다 (src/lib/api/naverImageSearch.ts).
   *
   * 여기 쓰는 것은 150px 썸네일이다 — 목록의 자리가 80px이라 그보다 큰 사진을 걸
   * 이유가 없다. 스냅샷 사진은 카드 커버용 340px이라 이 자리에선 조금 크다.
   */
  async function findPhotos(place: Place): Promise<{ photos: string[]; via: string }> {
    const image = await searchPlaceImage(place.name);
    if (image) return { photos: [image.thumbnail], via: "이미지검색" };
    const known = snapshotById.get(place.placeId) ?? snapshotByName.get(normalizeName(place.name));
    if (known?.photos.length) return { photos: known.photos, via: "스냅샷" };
    return { photos: [], via: "없음" };
  }

  const result: Record<string, TopPlace[]> = {};
  const recent: Record<string, TopPlace[]> = {};

  /**
   * 최근 RECENT_DAYS일에 글이 많이 올라온 순. 후보는 스냅샷의 그 카테고리 전체 +
   * 추천 검색 결과다(같은 곳은 이름으로 한 번만). 한 곳마다 블로그 검색을 한 번씩
   * 부르므로 카테고리당 70번 남짓 — 오프라인 스크립트라 순서대로 돈다.
   */
  async function rankRecent(category: Category, searched: Place[], label: string): Promise<TopPlace[]> {
    const pool = new Map<string, Place>();
    for (const place of [...SNAPSHOT_PLACES.filter((p) => p.category === category), ...searched]) {
      const key = normalizeName(place.name);
      if (!pool.has(key)) pool.set(key, place);
    }
    console.log(`\n[최근 ${RECENT_DAYS}일 ${label}] 후보 ${pool.size}곳`);

    const counted: (TopPlace & { recentBlogCount: number })[] = [];
    let index = 0;
    for (const place of pool.values()) {
      index += 1;
      // 두 글자 이름은 흔한 낱말과 구별되지 않아 셀 수 없다 (canCountRecentPosts 주석 참조).
      if (!canCountRecentPosts(place.name)) {
        console.log(`  - [${index}/${pool.size}] ${place.name} — 이름이 짧아 셀 수 없음`);
        continue;
      }
      const recentPosts = await countRecentBlogPosts(place.name, { days: RECENT_DAYS });
      if (!recentPosts || recentPosts.count === 0) continue;
      counted.push({
        ...place,
        blogReviewCount: 0,
        recentBlogCount: recentPosts.count,
        ...(recentPosts.capped ? { recentBlogCapped: true } : {}),
      });
      console.log(`  · [${index}/${pool.size}] ${place.name} — 최근 ${recentPosts.count}건`);
    }

    const ranked = counted.sort((a, b) => b.recentBlogCount - a.recentBlogCount).slice(0, PICK_COUNT);
    for (const place of ranked) {
      // 뽑힌 곳만 대표 글과 전체 기간 합계를 받는다 — 후보 전체에 부르면 호출이 두 배가 된다.
      const reviews = await searchBlogReviews(place.name, { count: 1 });
      const top = reviews?.reviews[0];
      place.blogReviewCount = reviews?.total ?? 0;
      if (top) {
        place.reviewTitle = top.title;
        place.reviewLink = top.link;
      }
      if (reviews) place.reviewSearchUrl = reviews.searchUrl;
      const { photos, via } = await findPhotos(place);
      place.photos = photos;
      console.log(`  ✓ ${place.name} (최근 ${place.recentBlogCount}건, 전체 ${place.blogReviewCount}건, 사진 ${via})`);
    }
    return ranked;
  }

  for (const category of ["cafe", "restaurant"] as Category[]) {
    const label = category === "cafe" ? "카페" : "맛집";
    console.log(`\n[양평 추천 ${label}]`);

    const candidates = await searchNaverRecommended(category);
    if (candidates.length === 0) {
      console.log("  ✗ 후보가 없습니다 — NCP_SEARCH_KEY_ID/NCP_SEARCH_KEY(지역 검색)을 확인하세요.");
      result[category] = [];
      recent[category] = await rankRecent(category, [], label);
      continue;
    }

    const counted: TopPlace[] = [];
    for (const place of candidates) {
      const reviews = await searchBlogReviews(place.name, { count: 1 });
      const top = reviews?.reviews[0];
      counted.push({
        ...place,
        blogReviewCount: reviews?.total ?? 0,
        ...(top ? { reviewTitle: top.title, reviewLink: top.link } : {}),
        ...(reviews ? { reviewSearchUrl: reviews.searchUrl } : {}),
      });
      console.log(`  · ${place.name} — 블로그 ${reviews?.total ?? 0}건`);
    }

    // 블로그 글이 한 건도 안 잡히는 곳은 "리뷰가 많은 집"으로 내보낼 수 없다.
    const ranked = counted
      .filter((place) => place.blogReviewCount > 0)
      .sort((a, b) => b.blogReviewCount - a.blogReviewCount)
      .slice(0, PICK_COUNT);

    for (const place of ranked) {
      const { photos, via } = await findPhotos(place);
      place.photos = photos;
      console.log(`  ✓ ${place.name} (블로그 ${place.blogReviewCount}건, 사진 ${via})`);
    }
    result[category] = ranked;
    recent[category] = await rankRecent(category, candidates, label);
  }

  const payload = {
    basis: "네이버 지역 검색(양평 추천 맛집/카페) 결과를 네이버 블로그 글 수로 다시 정렬",
    recentBasis: `스냅샷의 카페·맛집 전체를 최근 ${RECENT_DAYS}일 블로그 글 수로 정렬`,
    recentDays: RECENT_DAYS,
    cafe: result.cafe ?? [],
    restaurant: result.restaurant ?? [],
    recentCafe: recent.cafe ?? [],
    recentRestaurant: recent.restaurant ?? [],
  };

  // 순위가 그대로면 generatedAt도 그대로 둔다 — 주 1회 자동 실행(.github/workflows/
  // refresh-top-places.yml)이 시각만 바뀐 파일로 커밋을 만들지 않게.
  const unchanged = previousPayload() === JSON.stringify(payload);
  const generatedAt = (unchanged && previousGeneratedAt()) || new Date().toISOString();

  writeFileSync(OUTPUT, `${JSON.stringify({ generatedAt, ...payload }, null, 1)}\n`, "utf8");
  console.log(
    `\n저장: ${path.relative(process.cwd(), OUTPUT)}${unchanged ? " (순위 그대로)" : ""} ` +
      `(전체 기간 카페 ${result.cafe?.length ?? 0}곳·맛집 ${result.restaurant?.length ?? 0}곳, ` +
      `최근 ${RECENT_DAYS}일 카페 ${recent.cafe?.length ?? 0}곳·맛집 ${recent.restaurant?.length ?? 0}곳)`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
