// 네이버에서 "양평 추천 맛집 / 양평 추천 카페"를 검색했을 때 블로그 리뷰가 가장 많은
// 식당·카페 3곳씩을 골라 src/lib/data/topPlaces.json에 담는다. 실행: npm run build:top
//
// 네이버는 플레이스의 방문자 리뷰 수·별점을 공개 API로 주지 않는다. 지역 검색은
// sort=comment로 "리뷰 많은 순" 정렬만 해 주고 개수는 안 준다. 그래서 순위는
// 공개 API로 셀 수 있는 블로그 글 수(naverBlogSearch의 total)로 매긴다 —
// 화면에도 "블로그 리뷰 N건"으로 그대로 적어 무엇을 센 값인지 숨기지 않는다.
//
// 사진은 지역 검색이 주지 않으므로 ① 장소 스냅샷 ② TourAPI 키워드 검색에서 가져온다.
import { loadEnvConfig } from "@next/env";
import { writeFileSync } from "node:fs";
import path from "node:path";
import type { Category, Place, TopPlace } from "@/types/travel";
import { normalizeName, pickByName } from "./placeMatch";

loadEnvConfig(process.cwd());

const OUTPUT = path.join(process.cwd(), "src/lib/data/topPlaces.json");
const PICK_COUNT = 3;

async function main() {
  // env 로드 뒤에 import해야 모듈이 키를 읽는다.
  const { searchNaverRecommended } = await import("@/lib/api/naverSearch");
  const { searchBlogReviews } = await import("@/lib/api/naverBlogSearch");
  const { searchTourApiByKeyword } = await import("@/lib/api/tourApi");
  const { SNAPSHOT_PLACES } = await import("@/lib/data/placeSnapshot");

  const snapshotById = new Map(SNAPSHOT_PLACES.map((p) => [p.placeId, p]));
  const snapshotByName = new Map(SNAPSHOT_PLACES.map((p) => [normalizeName(p.name), p]));

  /** 지역 검색에는 사진이 없다 — 스냅샷에 같은 곳이 있으면 쓰고, 없으면 TourAPI에서 찾는다. */
  async function findPhotos(place: Place): Promise<{ photos: string[]; via: string }> {
    const known = snapshotById.get(place.placeId) ?? snapshotByName.get(normalizeName(place.name));
    if (known?.photos.length) return { photos: known.photos, via: "스냅샷" };
    const matched = pickByName(await searchTourApiByKeyword(place.name, place.category), [place.name]);
    if (matched?.photos.length) return { photos: matched.photos, via: "TourAPI" };
    return { photos: [], via: "없음" };
  }

  const result: Record<string, TopPlace[]> = {};

  for (const category of ["cafe", "restaurant"] as Category[]) {
    const label = category === "cafe" ? "카페" : "맛집";
    console.log(`\n[양평 추천 ${label}]`);

    const candidates = await searchNaverRecommended(category);
    if (candidates.length === 0) {
      console.log("  ✗ 후보가 없습니다 — NCP_MAP_CLIENT_ID/SECRET(지역 검색)을 확인하세요.");
      result[category] = [];
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
  }

  writeFileSync(
    OUTPUT,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        basis: "네이버 지역 검색(양평 추천 맛집/카페) 결과를 네이버 블로그 글 수로 다시 정렬",
        cafe: result.cafe ?? [],
        restaurant: result.restaurant ?? [],
      },
      null,
      1,
    )}\n`,
    "utf8",
  );
  console.log(
    `\n저장: ${path.relative(process.cwd(), OUTPUT)} ` +
      `(카페 ${result.cafe?.length ?? 0}곳, 맛집 ${result.restaurant?.length ?? 0}곳)`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
