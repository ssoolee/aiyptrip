export type Category = "restaurant" | "cafe" | "attraction" | "lodging";

export type PresetType =
  | "solo"
  | "pet"
  | "mbti"
  // 자연어 요청으로 만든 코스 (/course/search)
  | "custom";

export interface Place {
  placeId: string;
  name: string;
  category: Category;
  // 원천 데이터의 세부 업종 (예: 네이버 "한식>막국수"). 태깅 근거로 쓴다.
  categoryLabel?: string;
  lat: number;
  lng: number;
  address: string;
  phone?: string;
  rating?: number;
  businessHoursRaw?: string;
  photos: string[];
  mapUrl: string;
  tags: string[];
  petFriendly?: boolean;
  reviewSummary?: string;
}

export interface ItineraryStop extends Place {
  timeSlot: string;
  // 큐레이션 코스(src/lib/data/mbtiCourses.json)에서 이 장소를 넣은 이유
  reason?: string;
}

export interface ItineraryDay {
  day: number;
  stops: ItineraryStop[];
}

export interface Course {
  courseId: string;
  title: string;
  presetType: PresetType;
  days: ItineraryDay[];
  // curated: 미리 만들어 둔 코스, generated: 에이전트 파이프라인이 만든 코스
  source?: "curated" | "generated";
  // 검증에서 걸러내지 못한 주의사항 (영업시간이 일정과 맞지 않을 수 있는 장소 등).
  // Firestore에 코스 전체가 저장되므로(src/lib/favorites.ts) 없을 때는 필드를 넣지 않는다.
  notice?: string;
}

// MBTI 유형별로 코스와 따로 보여주는 숙소·펜션 추천
export interface LodgingPick extends Place {
  lodgingType: string;
  reason?: string;
  // 예약 전에 확인할 점 (객실 구성, 포함 시설 등)
  notice?: string;
}

export interface PresetDefinition {
  type: PresetType;
  label: string;
  emoji: string;
  description: string;
  tags: string[];
}
