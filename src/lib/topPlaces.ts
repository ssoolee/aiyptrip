import data from "@/lib/data/topPlaces.json";
import { withFreshFacts } from "@/lib/curation";
import { TopPlace } from "@/types/travel";

// scripts/build-top-places.ts(npm run build:top)가 뽑아 둔, 네이버 블로그 글이 많은
// 양평 맛집·카페. 두 가지 순위가 들어 있다 — 전체 기간(cafe/restaurant)과
// 최근 한 달(recentCafe/recentRestaurant). 키가 없어 아직 만들지 않았거나 파일이
// 최근 순위 이전 판이면 그 목록만 빈 배열이고, 화면은 그 묶음을 접는다.

/** 파일에 recentDays가 없던 시절(최근 순위 도입 전) 판을 읽을 때의 기본값. */
const DEFAULT_RECENT_DAYS = 30;

export interface TopPlaces {
  generatedAt: string | null;
  /** 최근 순위를 몇 일 기준으로 셌는지 — 화면에 그대로 적는다. */
  recentDays: number;
  cafe: TopPlace[];
  restaurant: TopPlace[];
  recentCafe: TopPlace[];
  recentRestaurant: TopPlace[];
}

// 최근 순위는 나중에 더해진 항목이라, 예전에 만든 파일에는 없을 수 있다.
const file = data as {
  generatedAt?: string | null;
  recentDays?: number;
  cafe?: TopPlace[];
  restaurant?: TopPlace[];
  recentCafe?: TopPlace[];
  recentRestaurant?: TopPlace[];
};

// 영업시간·전화번호는 스냅샷 쪽이 새로우므로 덮어 쓴다 (src/lib/curation.ts).
function fresh(places: TopPlace[] | undefined): TopPlace[] {
  return (places ?? []).map(withFreshFacts);
}

export function getTopPlaces(): TopPlaces {
  return {
    generatedAt: file.generatedAt ?? null,
    recentDays: file.recentDays ?? DEFAULT_RECENT_DAYS,
    cafe: fresh(file.cafe),
    restaurant: fresh(file.restaurant),
    recentCafe: fresh(file.recentCafe),
    recentRestaurant: fresh(file.recentRestaurant),
  };
}
