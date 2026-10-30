import { retrievePlaces } from "@/lib/agents/placeRetrieval";
import { SEOUL_ORIGIN, scheduleItinerary } from "@/lib/agents/schedule";
import { distanceKm, type LatLng } from "@/lib/geo";
import { Category, ItineraryDay, ItineraryStop, Place } from "@/types/travel";

// docs/agents/03-itinerary-composer-agent.md 참조.
//
// 코스는 "서울에서 출발하는 사람"을 기준으로 짠다. 하루의 뼈대(어떤 카테고리를 어떤
// 순서로 도는지)만 여기서 정하고, 실제 시각은 src/lib/agents/schedule.ts가
// 서울 출발 시각 + 이동시간 + 체류시간을 이어 붙여 계산한다 — 그래서 템플릿에는
// 고정 시간대("14:00-15:00")가 더 이상 없다.
//
// TODO: 실제 이동시간 계산(네이버 Directions/ODsay) 연동 시 driveMinutes를 교체한다.
// (NCP Directions는 발급받은 키에 아직 상품 구독이 안 되어 있어 대기 중 —
// docs/prd/02-map-realtime-location-prd.md §5의 "직선거리 fallback" 요건대로
// 현재는 좌표 기반 어림값을 쓴다.)

// 하루 일정의 뼈대. 시간은 schedule.ts가 붙이므로 여기엔 순서만 적는다.
type DayTemplate = { category: Category; skipOnLastDay?: boolean }[];

// 당일치기 — 09:00 서울 출발 기준으로 오전 관광 → 점심 → 오후 관광 → 카페 →
// 이른 저녁까지 돈 뒤 밤이 되기 전에 서울로 돌아온다.
const DAY_TRIP_TEMPLATE: DayTemplate = [
  { category: "attraction" },
  { category: "restaurant" },
  { category: "attraction" },
  { category: "cafe" },
  { category: "restaurant" },
];

// 1박 이상: 1일차는 당일치기와 같은 흐름에 숙소를 더하고, 마지막 날은 체크아웃
// 뒤 서울로 돌아갈 시간을 남겨 세 곳만 돈다.
const DAY_TEMPLATES: DayTemplate[] = [
  [...DAY_TRIP_TEMPLATE, { category: "lodging", skipOnLastDay: true }],
  [{ category: "attraction" }, { category: "restaurant" }, { category: "cafe" }],
];

// 조건에 맞는 후보가 아예 없는 카테고리가 생길 수 있다 — 반려동물 동반이 그렇다.
// "반려동물 동반 가능 업소 현황"에 음식점·카페만 올라와 있어 동반 가능한 관광지가
// 한 곳도 없다(src/lib/agents/placeRetrieval.ts 주석 참조). 그 자리를 그대로 비우면
// 점심과 저녁 사이가 통째로 비는 코스가 나오므로, 성격이 가장 가까운 카테고리에서
// 대신 채운다. 식당은 대신 채우지 않는다 — 끼니 수가 늘어나 버린다.
const FALLBACK_CATEGORIES: Partial<Record<Category, Category[]>> = {
  attraction: ["cafe"],
  cafe: ["attraction"],
};

// 한 슬롯마다 받아 보는 후보 수. 이 중에서 직전 지점과 가장 가까운 곳을 고른다 —
// 후보는 이미 취향 점수순이라, 몇 개로 좁혀 두면 "취향에 맞는 곳들 중 동선이 짧은 곳"이 된다.
const SHORTLIST = 4;

function templateFor(day: number, durationDays: number): DayTemplate {
  if (durationDays === 1) return DAY_TRIP_TEMPLATE;
  return DAY_TEMPLATES[Math.min(day - 1, DAY_TEMPLATES.length - 1)];
}

/** 후보 중 직전 지점에서 가장 빨리 닿는 곳. 이동시간이 같으면 앞선(취향 점수가 높은) 후보. */
function nearestCandidate(from: LatLng, candidates: Place[]): Place {
  let best = candidates[0];
  let bestKm = distanceKm(from, best);
  for (const candidate of candidates.slice(1)) {
    const km = distanceKm(from, candidate);
    if (km < bestKm) {
      best = candidate;
      bestKm = km;
    }
  }
  return best;
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

  // 한 코스가 카테고리마다 쓰는 슬롯 수(예: 2일 코스의 식당 3곳). 코스 offset을
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

  // 그날 출발하는 자리 — 첫날은 서울, 다음 날은 전날 묵은 숙소.
  let origin: LatLng = SEOUL_ORIGIN;

  for (let day = 1; day <= durationDays; day++) {
    const isLastDay = day === durationDays;
    const template = templateFor(day, durationDays);
    const stops: ItineraryStop[] = [];
    let from = origin;

    for (const slot of template) {
      if (isLastDay && slot.skipOnLastDay) continue;
      let candidate: Place | undefined;
      for (const category of [slot.category, ...(FALLBACK_CATEGORIES[slot.category] ?? [])]) {
        const candidates = await retrievePlaces({
          category,
          tags,
          requirePetFriendly,
          excludePlaceIds: Array.from(usedPlaceIds),
          count: SHORTLIST,
          offset: offset * (slotsPerCategory.get(category) ?? 1),
        });
        if (candidates.length > 0) {
          candidate = nearestCandidate(from, candidates);
          break;
        }
      }
      if (!candidate) continue;
      usedPlaceIds.add(candidate.placeId);
      // 시각은 scheduleItinerary가 다시 쓴다 — 여기서는 자리만 채워 둔다.
      stops.push({ ...candidate, timeSlot: "" });
      from = candidate;
    }

    if (stops.length > 0) days.push({ day, stops });

    const lodging = stops.find((stop) => stop.category === "lodging");
    if (lodging) origin = lodging;
  }

  return scheduleItinerary(days);
}
