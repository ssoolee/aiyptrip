import PetPlacesScreen from "@/components/PetPlacesScreen";
import { SNAPSHOT_PLACES } from "@/lib/data/placeSnapshot";

// 반려동물 동반 가능 업소 지도. 업소 현황(src/lib/data/petPlaces.json)과 소개글에 동반 가능이
// 명시된 장소를 합친 목록 — 스냅샷 전체가 클라이언트 번들에 들어가지 않도록 서버에서 고른다.
export default function PetPlacesPage() {
  return <PetPlacesScreen places={SNAPSHOT_PLACES.filter((p) => p.petFriendly)} />;
}
