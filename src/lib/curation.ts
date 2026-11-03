import { SNAPSHOT_PLACES } from "@/lib/data/placeSnapshot";
import { scheduleItinerary } from "@/lib/agents/schedule";
import { staticLegLookup } from "@/lib/routeLegs";
import { validateItinerary } from "@/lib/agents/validation";
import { Course, ItineraryStop, Place } from "@/types/travel";
import { fill } from "@/lib/i18n/format";

// 미리 만들어 둔 코스(MBTI 큐레이션, 혼자 여행 테마 코스)를 화면에 올리기 전에
// 손보는 공통 처리. 빌드 시점에 얼려 둔 사본이라 그대로 쓰면 두 가지가 어긋난다 —
// ① 그 뒤 스냅샷에 들어온 영업시간·전화번호가 빠져 있고
// ② 파일에 적힌 시간대는 서울에서 오는 시간을 치지 않았다.

const SNAPSHOT_BY_ID = new Map(SNAPSHOT_PLACES.map((p) => [p.placeId, p]));

/**
 * 큐레이션의 고유 정보(추천 이유 등)는 그대로 두고 자주 바뀌는 사실만 스냅샷 값으로
 * 덮어 쓴다 — 빌드 스크립트를 다시 돌리지 않아도 반영된다.
 */
export function withFreshFacts<T extends Place>(place: T): T {
  const fresh = SNAPSHOT_BY_ID.get(place.placeId);
  if (!fresh) return place;
  return {
    ...place,
    businessHoursRaw: fresh.businessHoursRaw ?? place.businessHoursRaw,
    phone: fresh.phone ?? place.phone,
    rating: fresh.rating ?? place.rating,
    // 사진도 자주 바뀌는 쪽이다 — 스냅샷을 앞세워야 npm run build:photos로 받은 사진이
    // 큐레이션 코스에도 바로 반영된다. 얼려 둔 사본은 스냅샷에 없는 장소에만 쓴다.
    photos: fresh.photos.length > 0 ? fresh.photos : place.photos,
  };
}

/**
 * 큐레이션 코스는 사람이(또는 빌드 때 파이프라인이) 고른 조합이라 장소를 바꾸지 않는다.
 * 그래서 파이프라인 코스처럼 재구성하지 않고, 오늘 방문했을 때 닫혀 있을 장소만
 * 주의 문구로 알린다 (docs/agents/04-validation-agent.md "실패/재시도 처리"와 같은 처리).
 */
/**
 * 주의 문구의 기본 틀. 화면에서 부를 때는 사전의 notice.mayBeClosed를 넘긴다 —
 * 여기 기본값은 빌드 스크립트나 테스트처럼 사전이 없는 자리를 위한 것이다.
 */
const DEFAULT_HOURS_NOTICE = "{names} — 오늘은 문을 닫을 수 있어요. 가기 전에 확인해 주세요.";

export function withHoursNotice(course: Course, noticeTemplate?: string): Course {
  const { issues } = validateItinerary(course.days);
  if (issues.length === 0) return course;
  const names = [...new Set(issues.map((issue) => issue.placeName))];
  return {
    ...course,
    notice: fill(noticeTemplate ?? DEFAULT_HOURS_NOTICE, { names: names.join(", ") }),
  };
}

/**
 * 얼려 둔 코스를 오늘 쓸 수 있는 코스로 되살린다 — 장소 사실 갱신 → 시각 재계산
 * (서울 09:00 출발 + 이동·체류시간) → 영업시간 주의 문구.
 *
 * 이동시간은 미리 받아 둔 실측 구간(src/lib/data/routeLegs.json)을 쓴다. 목록을 그릴
 * 때마다 도는 함수라 **동기로 유지**하는 것이 중요하다 — 여기서 Directions를 부르면
 * 한 화면에 수십 번 왕복이 생겨 미리 만들어 둔 코스의 이점이 사라진다.
 * 표에 없는 구간은 직선거리 어림값으로 메워진다.
 */
export function rehydrateCourse(course: Course, noticeTemplate?: string): Course {
  return withHoursNotice(
    {
      ...course,
      days: scheduleItinerary(
        course.days.map((day) => ({
          ...day,
          stops: day.stops.map((stop) => withFreshFacts<ItineraryStop>(stop)),
        })),
        staticLegLookup,
      ),
    },
    noticeTemplate,
  );
}
