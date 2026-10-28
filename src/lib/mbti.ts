import curation from "@/lib/data/mbtiCourses.json";
import { SNAPSHOT_PLACES } from "@/lib/data/placeSnapshot";
import { validateItinerary } from "@/lib/agents/validation";
import { Course, ItineraryStop, LodgingPick, Place } from "@/types/travel";

// docs/prd/01-ai-course-recommendation-prd.md §3.1 MBTI-취향 매핑표
// "더 보기"로 추가 생성하는 코스(에이전트 파이프라인)의 취향 태그로 쓴다.
const MBTI_TAG_MAP: Record<string, string[]> = {
  E: ["activity", "lively_food", "group"],
  I: ["quiet_cafe", "nature", "healing"],
  S: ["local_food", "experience"],
  N: ["aesthetic", "photo_spot"],
  T: ["experience"],
  F: ["aesthetic", "romantic"],
  J: ["experience"],
  P: ["nature", "quiet_cafe"],
};

export function tagsForMbti(mbti?: string): string[] {
  if (!mbti) return ["nature", "aesthetic"];
  const letters = mbti.toUpperCase().split("").filter((c) => c in MBTI_TAG_MAP);
  const tags = new Set<string>();
  for (const letter of letters) {
    for (const tag of MBTI_TAG_MAP[letter]) tags.add(tag);
  }
  return tags.size > 0 ? Array.from(tags) : ["nature", "aesthetic"];
}

// 16유형을 흔히 쓰는 4개 기질 그룹으로 묶어 버튼 화면에 보여준다.
export const MBTI_GROUPS: { label: string; types: string[] }[] = [
  { label: "분석가형", types: ["INTJ", "INTP", "ENTJ", "ENTP"] },
  { label: "외교관형", types: ["INFJ", "INFP", "ENFJ", "ENFP"] },
  { label: "관리자형", types: ["ISTJ", "ISFJ", "ESTJ", "ESFJ"] },
  { label: "탐험가형", types: ["ISTP", "ISFP", "ESTP", "ESFP"] },
];

export const MBTI_TYPES = MBTI_GROUPS.flatMap((g) => g.types);

export function isMbtiType(value: string): boolean {
  return MBTI_TYPES.includes(value);
}

export interface MbtiCuration {
  summary?: string;
  courses: Course[];
  lodging: LodgingPick[];
}

// 큐레이션 파일은 만들어진 시점의 장소 사본을 담고 있어, 그 뒤에 스냅샷으로 들어온
// 영업시간·전화번호가 빠져 있다. 큐레이션의 고유 정보(추천 이유, 시간대)는 그대로 두고
// 자주 바뀌는 사실만 스냅샷 값으로 덮어 쓴다 — build:mbti를 다시 돌리지 않아도 반영된다.
const SNAPSHOT_BY_ID = new Map(SNAPSHOT_PLACES.map((p) => [p.placeId, p]));

function withFreshFacts<T extends Place>(place: T): T {
  const fresh = SNAPSHOT_BY_ID.get(place.placeId);
  if (!fresh) return place;
  return {
    ...place,
    businessHoursRaw: fresh.businessHoursRaw ?? place.businessHoursRaw,
    phone: fresh.phone ?? place.phone,
    rating: fresh.rating ?? place.rating,
    photos: place.photos.length > 0 ? place.photos : fresh.photos,
  };
}

/**
 * 큐레이션 코스는 사람이 고른 조합이라 장소를 바꿀 수 없다. 그래서 파이프라인 코스처럼
 * 재구성하지 않고, 오늘 방문했을 때 닫혀 있을 장소만 주의 문구로 알린다
 * (docs/agents/04-validation-agent.md "실패/재시도 처리"와 같은 처리).
 */
function withHoursNotice(course: Course): Course {
  const { issues } = validateItinerary(course.days);
  if (issues.length === 0) return course;
  const names = [...new Set(issues.map((issue) => issue.placeName))];
  return { ...course, notice: `${names.join(", ")} — 오늘은 문을 닫을 수 있어요. 가기 전에 확인해 주세요.` };
}

// 큐레이션 코스의 courseId는 "mbti_ISTJ_curated_1"처럼 고정이라, 코스 상세 화면이
// URL만으로 다시 찾을 수 있다 (파이프라인 코스는 요청마다 새로 만들어져 불가능 —
// src/lib/courseCache.ts 참조).
const CURATED_COURSE_ID = /^mbti_([A-Z]{4})_curated_\d+$/;

export function findCuratedCourse(courseId: string): Course | undefined {
  const match = CURATED_COURSE_ID.exec(courseId);
  if (!match) return undefined;
  return getMbtiCuration(match[1]).courses.find((course) => course.courseId === courseId);
}

// scripts/build-mbti-courses.ts(npm run build:mbti)가 만든 유형별 큐레이션 코스.
// 해당 유형 자료가 아직 없으면 빈 값 — 화면은 자동 생성 코스로 대체한다.
export function getMbtiCuration(type: string): MbtiCuration {
  const entry = (curation.types as Record<string, Partial<MbtiCuration>>)[type];
  return {
    summary: entry?.summary,
    courses: (entry?.courses ?? []).map((course) => withHoursNotice({
      ...course,
      days: course.days.map((day) => ({
        ...day,
        stops: day.stops.map((stop) => withFreshFacts<ItineraryStop>(stop)),
      })),
    })),
    lodging: (entry?.lodging ?? []).map((pick) => withFreshFacts<LodgingPick>(pick)),
  };
}
