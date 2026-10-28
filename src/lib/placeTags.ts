// 장소 취향 태그 어휘. 프리셋(src/lib/presets.ts)과 MBTI 매핑(src/lib/mbti.ts)이
// 쓰는 태그와 같아야 코스 점수에 반영된다. scripts/build-places.ts가 LLM에게
// 이 설명을 주고 실제 장소에 태그를 붙인다.
// (pet_friendly는 태그 대신 Place.petFriendly, festival은 축제 API가 붙인다.)
export const PLACE_TAGS = {
  healing: "휴식·힐링하기 좋은 곳",
  quiet_cafe: "조용히 머물기 좋은 카페 (카페만)",
  view_cafe: "강·산 전망이 좋은 카페 (카페만)",
  nature: "숲·강·계곡 등 자연 경관",
  romantic: "연인 데이트에 어울리는 곳",
  photo_spot: "사진 찍기 좋은 명소",
  aesthetic: "감성적인 인테리어·분위기",
  experience: "직접 해보는 체험 활동",
  kid_friendly: "아이와 함께 가기 좋은 곳",
  activity: "레포츠·액티비티",
  lively_food: "여럿이 떠들썩하게 먹기 좋은 식당 (고기구이·바비큐 등)",
  group: "단체 방문에 적합",
  local_food: "양평 향토·지역 음식",
  indoor: "실내 위주라 비 오는 날에도 좋은 곳",
} as const;

export type PlaceTag = keyof typeof PLACE_TAGS;

export function isPlaceTag(tag: string): tag is PlaceTag {
  return tag in PLACE_TAGS;
}
