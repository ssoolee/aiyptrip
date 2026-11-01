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

/**
 * 도로 경로의 한 점 — **[경도, 위도]** 순서다(네이버 Directions 응답 순서를 그대로 쓴다).
 * `LatLng`는 `{lat, lng}`라서 순서가 반대다 — 다루는 함수는 src/lib/routePath.ts.
 */
export type RoutePoint = [lng: number, lat: number];

export interface ItineraryStop extends Place {
  timeSlot: string;
  // 직전 지점(그날 출발지 또는 앞 스팟)에서 여기까지 오는 데 걸리는 시간(분).
  // src/lib/agents/schedule.ts가 붙인다. travelMeters가 함께 있으면 실측 주행값이고,
  // 없으면 직선거리 기준 어림값이다.
  travelMinutes?: number;
  // 직전 지점에서 여기까지의 실제 주행거리(m). 실측 구간에만 있다 —
  // 이 필드의 존재 자체가 "실측"의 표식이라, 따로 플래그를 두지 않는다.
  travelMeters?: number;
  // 직전 지점에서 여기까지의 실제 도로 경로(단순화된 좌표). 지도가 직선 대신 이걸 그린다.
  // 서울 출발·복귀 구간에는 넣지 않는다 — 지도는 양평만 보여주므로 쓰이지 않는다.
  routeFromPrev?: RoutePoint[];
  // 큐레이션 코스(src/lib/data/mbtiCourses.json)에서 이 장소를 넣은 이유
  reason?: string;
}

/** 하루의 출발 또는 복귀 — "서울에서 09:00 출발, 65분" 같은 안내. */
export interface ItineraryTransfer {
  place: string;
  at: string;
  minutes: number;
  // 실제 주행거리(m). 있으면 minutes도 실측값이다 (ItineraryStop.travelMeters와 같은 규칙).
  meters?: number;
}

export interface ItineraryDay {
  day: number;
  stops: ItineraryStop[];
  // 그날 어디서 몇 시에 나서는지 (1일차는 서울, 그 뒤는 전날 묵은 숙소).
  departure?: ItineraryTransfer;
  // 마지막 날 서울로 돌아오는 시각. 숙소에서 하루를 마치는 날에는 없다.
  arrival?: ItineraryTransfer;
}

export interface Course {
  courseId: string;
  title: string;
  presetType: PresetType;
  days: ItineraryDay[];
  // curated: 미리 만들어 둔 코스, generated: 에이전트 파이프라인이 만든 코스
  source?: "curated" | "generated";
  // 왜 이 코스를 추천했는지 — 200자 안팎의 설명. 미리 만들어 둔 코스는 빌드 때
  // (scripts/build-solo-courses.ts), 파이프라인 코스는 enrichment가 붙인다.
  reason?: string;
  // 검증에서 걸러내지 못한 주의사항 (영업시간이 일정과 맞지 않을 수 있는 장소 등).
  // Firestore에 코스 전체가 저장되므로(src/lib/favorites.ts) 없을 때는 필드를 넣지 않는다.
  notice?: string;
}

/** 네이버 블로그 리뷰가 많은 순으로 뽑은 맛집·카페 (src/lib/data/topPlaces.json) */
export interface TopPlace extends Place {
  /** 네이버 블로그 검색 결과 수 — 평점·방문자 리뷰는 공개 API로 받을 수 없다. */
  blogReviewCount: number;
  /** 대표 블로그 글 한 건 (제목·주소) */
  reviewTitle?: string;
  reviewLink?: string;
  /** 블로그 검색 전체 결과로 나가는 링크 */
  reviewSearchUrl?: string;
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
