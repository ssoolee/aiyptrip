import { retrievePlaces } from "@/lib/agents/placeRetrieval";
import { Category, ItineraryDay, ItineraryStop } from "@/types/travel";

// docs/agents/03-itinerary-composer-agent.md 참조.
// TODO: 실제 이동시간 계산(네이버 Directions/ODsay) 연동 시 슬롯 배정 로직 보강.
// (NCP Directions는 발급받은 키에 아직 상품 구독이 안 되어 있어 대기 중 —
// docs/prd/02-map-realtime-location-prd.md §5의 "직선거리 fallback" 요건대로
// 현재는 좌표 기반 순서(방문 순서)만 사용하고 실제 이동시간은 계산하지 않는다.)
type DayTemplate = { category: Category; timeSlot: string; skipOnLastDay?: boolean }[];

// 1박 이상 일정의 일차별 템플릿 (1일차는 오후 도착, 마지막 날은 숙소 제외).
const DAY_TEMPLATES: DayTemplate[] = [
  [
    { category: "cafe", timeSlot: "14:00-15:00" },
    { category: "attraction", timeSlot: "15:30-17:00" },
    { category: "restaurant", timeSlot: "18:00-19:30" },
    { category: "lodging", timeSlot: "20:00", skipOnLastDay: true },
  ],
  [
    { category: "attraction", timeSlot: "09:30-11:00" },
    { category: "restaurant", timeSlot: "12:00-13:30" },
    { category: "cafe", timeSlot: "14:00-15:00" },
  ],
];

// 당일치기는 오전부터 시작한다. 1박용 1일차 템플릿을 쓰면 오전이 비고, 반려동물처럼
// 동반 가능 관광지가 없는 조건에선 카페·식당 2곳짜리 코스가 된다 — 점심·저녁을 둬 3곳 이상 확보.
const DAY_TRIP_TEMPLATE: DayTemplate = [
  { category: "attraction", timeSlot: "10:30-12:00" },
  { category: "restaurant", timeSlot: "12:00-13:30" },
  { category: "cafe", timeSlot: "14:00-15:00" },
  { category: "restaurant", timeSlot: "18:00-19:30" },
];

function templateFor(day: number, durationDays: number): DayTemplate {
  if (durationDays === 1) return DAY_TRIP_TEMPLATE;
  return DAY_TEMPLATES[Math.min(day - 1, DAY_TEMPLATES.length - 1)];
}

export async function composeItinerary(params: {
  durationDays: number;
  tags: string[];
  requirePetFriendly?: boolean;
  offset?: number;
  usedPlaceIds?: Set<string>;
}): Promise<ItineraryDay[]> {
  const { durationDays, tags, requirePetFriendly, offset = 0 } = params;
  const usedPlaceIds = params.usedPlaceIds ?? new Set<string>();
  const days: ItineraryDay[] = [];

  // 한 코스가 카테고리마다 쓰는 슬롯 수(예: 2일 코스의 카페 2곳). 코스 offset을
  // 이만큼씩 건너뛰어야 다음 코스가 이전 코스의 후보를 다시 쓰지 않는다 —
  // offset을 1씩만 밀면 코스 N의 두 번째 카페가 코스 N+1의 첫 카페가 된다.
  const slotsPerCategory = new Map<Category, number>();
  for (let day = 1; day <= durationDays; day++) {
    const template = templateFor(day, durationDays);
    for (const slot of template) {
      if (day === durationDays && slot.skipOnLastDay) continue;
      slotsPerCategory.set(slot.category, (slotsPerCategory.get(slot.category) ?? 0) + 1);
    }
  }

  for (let day = 1; day <= durationDays; day++) {
    const isLastDay = day === durationDays;
    const template = templateFor(day, durationDays);
    const stops: ItineraryStop[] = [];

    for (const slot of template) {
      if (isLastDay && slot.skipOnLastDay) continue;
      const [candidate] = await retrievePlaces({
        category: slot.category,
        tags,
        requirePetFriendly,
        excludePlaceIds: Array.from(usedPlaceIds),
        count: 1,
        offset: offset * (slotsPerCategory.get(slot.category) ?? 1),
      });
      if (!candidate) continue;
      usedPlaceIds.add(candidate.placeId);
      stops.push({ ...candidate, timeSlot: slot.timeSlot });
    }

    if (stops.length > 0) days.push({ day, stops });
  }

  return days;
}
