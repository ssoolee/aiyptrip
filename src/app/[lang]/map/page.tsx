import MapScreen from "@/components/MapScreen";
import { SNAPSHOT_PLACES } from "@/lib/data/placeSnapshot";
import { withFreshFacts } from "@/lib/curation";
import { currentLocale } from "@/lib/i18n/server";
import { Place } from "@/types/travel";

// 찜한 코스가 없을 때 보여줄 양평 주요 관광지 — 스냅샷(인기순) 중 태그가 붙은
// 관광지 상위 10곳. 스냅샷 전체가 클라이언트 번들에 들어가지 않도록 서버에서 고른다.
// 마커를 눌러 상세 시트를 열 수 있어야 하므로(PRD-02 §3) 좌표만이 아니라 장소 전체를 넘긴다.
const OVERVIEW_COUNT = 10;

export default async function MapPage() {
  const locale = await currentLocale();
  const overviewPlaces: Place[] = SNAPSHOT_PLACES.filter(
    (p) => p.category === "attraction" && p.tags.length > 0,
  )
    .slice(0, OVERVIEW_COUNT)
    // 번역은 withFreshFacts를 거쳐야 한다 — 통로를 하나로 두는 규칙(src/lib/i18n/content.ts).
    .map((place) => withFreshFacts(place, locale));

  return <MapScreen overviewPlaces={overviewPlaces} />;
}
