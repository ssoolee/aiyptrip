import { Place } from "@/types/travel";
import { dedupePlaces } from "@/lib/placeIdentity";
import snapshot from "@/lib/data/places.json";
import petPlaces from "@/lib/data/petPlaces.json";

// scripts/build-places.ts(npm run build:places)가 만든 실제 장소 스냅샷.
// 네이버 지역 검색 + TourAPI 장소에 LLM 취향 태그·반려동물 동반 여부·요약을
// 붙여 둔 "자체 캐시 DB" (docs/agents/02-place-retrieval-agent.md).
//
// 여기에 반려동물 동반 가능 업소 현황(scripts/build-pet-places.ts, npm run build:pet)을
// 합친다: 스냅샷에 있는 업소는 petFriendly로 표시하고, 없는 업소는 뒤에 붙인다.
// 스냅샷을 다시 만들어도 반려동물 목록이 사라지지 않도록 파일을 따로 둔다.
const petFriendlyIds = new Set<string>(petPlaces.petFriendlyIds);

// 같은 업체가 두 항목으로 들어와 있으면(출처마다 ID가 달라 생긴다 — 예: "쏭바베큐
// 양평본점"/"쏭바베큐") 한 코스에 두 번 나올 수 있어 적재할 때 걸러낸다. 스냅샷을
// 다시 만들 때도 같은 판정으로 병합하지만(scripts/build-places.ts), 이미 커밋된
// 데이터를 쓰는 지금 화면을 위해 여기서도 한 번 거른다.
export const SNAPSHOT_PLACES: Place[] = dedupePlaces([
  ...(snapshot.places as Place[]).map((p) => (petFriendlyIds.has(p.placeId) ? { ...p, petFriendly: true } : p)),
  ...(petPlaces.places as Place[]),
]);
export const SNAPSHOT_GENERATED_AT = snapshot.generatedAt;
