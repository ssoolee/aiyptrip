import data from "@/lib/data/topPlaces.json";
import { withFreshFacts } from "@/lib/curation";
import { TopPlace } from "@/types/travel";

// scripts/build-top-places.ts(npm run build:top)가 뽑아 둔, 네이버 블로그 리뷰가
// 많은 양평 맛집·카페. 키가 없어 아직 만들지 않았으면 빈 배열이고, 화면은 영역을 접는다.

export interface TopPlaces {
  generatedAt: string | null;
  cafe: TopPlace[];
  restaurant: TopPlace[];
}

export function getTopPlaces(): TopPlaces {
  return {
    generatedAt: (data.generatedAt as string | null) ?? null,
    // 영업시간·전화번호는 스냅샷 쪽이 새로우므로 덮어 쓴다 (src/lib/curation.ts).
    cafe: (data.cafe as TopPlace[]).map(withFreshFacts),
    restaurant: (data.restaurant as TopPlace[]).map(withFreshFacts),
  };
}
