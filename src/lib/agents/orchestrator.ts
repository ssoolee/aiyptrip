import { after } from "next/server";
import { composeItinerary } from "@/lib/agents/itineraryComposer";
import { ValidationResult, validateItinerary } from "@/lib/agents/validation";
import { enrichCourse } from "@/lib/agents/enrichment";
import { getPreset } from "@/lib/presets";
import { tagsForMbti } from "@/lib/mbti";
import { courseSignature } from "@/lib/courseSignature";
import { saveCourses } from "@/lib/courseStore";
import { TripConditions } from "@/lib/agents/requestInterpreter";
import { Course, ItineraryDay, PresetType } from "@/types/travel";

// docs/agents/04-validation-agent.md "실패/재시도 처리" — 반려된 장소를 빼고 다시 구성하는
// 루프는 최대 3회. 초과하면 남은 문제를 안내 문구로 바꿔 코스를 그대로 보여준다.
const MAX_VALIDATION_ATTEMPTS = 3;

// docs/agents/01-orchestrator-agent.md 참조.
// 조건은 두 경로로 들어온다: 프리셋 선택(presetType) 또는 자연어 요청을
// requestInterpreter가 해석한 결과(conditions, presetType="custom").
export async function generateCourses(params: {
  presetType: PresetType;
  count?: number;
  offsetStart?: number;
  mbti?: string;
  // 프리셋 화면의 일정 탭(당일치기=1, 1박 2일=2). 자연어 요청은 conditions의 일정을 쓴다.
  durationDays?: number;
  conditions?: TripConditions;
  // 1일차 방문 요일(0=일 … 6=토). 생략하면 오늘 — 영업시간 검증 기준이 된다.
  visitWeekday?: number;
}): Promise<Course[]> {
  const { presetType, count = 3, offsetStart = 0, mbti, conditions, visitWeekday } = params;
  const preset = getPreset(presetType);
  const tags = conditions?.tags ?? (presetType === "mbti" ? tagsForMbti(mbti) : preset?.tags ?? []);
  const requirePetFriendly = conditions?.requirePetFriendly ?? presetType === "pet";
  const durationDays = conditions?.durationDays ?? params.durationDays ?? 2;
  const label =
    conditions?.companionLabel ??
    (presetType === "mbti" && mbti ? `${mbti.toUpperCase()} 성향` : preset?.label) ??
    "양평 여행";

  // 코스별 생성은 서로 독립적이라 병렬로 돌린다 — 특히 enrichment의 LLM 호출이
  // 가끔 수 초씩 지연되는데, 순차 실행하면 그 지연이 코스 수만큼 누적돼
  // 평균 응답 15초(PRD-00 KPI)를 넘긴다.
  const offsets = Array.from({ length: count }, (_, i) => offsetStart + i);
  const composed = await Promise.all(
    offsets.map((offset) =>
      composeValidated({ durationDays, tags, requirePetFriendly, offset, visitWeekday }),
    ),
  );

  // 후보가 적은 조건(예: 반려동물 동반 장소 2곳)에선 offset을 바꿔도 같은
  // 코스가 나온다 — 똑같은 코스를 여러 장 보여주지 않도록 거른다.
  const seen = new Set<string>();
  const approved = composed
    .map((result, i) => ({ result, offset: offsets[i] }))
    .filter((entry): entry is { result: ComposedCourse; offset: number } => entry.result !== null)
    .filter(({ result }) => {
      const signature = courseSignature(result.days);
      if (seen.has(signature)) return false;
      seen.add(signature);
      return true;
    });

  const courses = await Promise.all(
    approved.map(({ result, offset }) =>
      enrichCourse({
        days: result.days,
        notice: result.notice,
        presetType,
        label,
        courseId: `${presetType}_${offset}_${Date.now().toString(36)}`,
      }),
    ),
  );

  // 코스 상세 URL을 나중에 다시 열 수 있도록 남긴다. 응답을 늦추지 않게 after로 미룬다.
  try {
    after(() => saveCourses(courses));
  } catch {
    // 요청 바깥(스크립트·테스트)에서 부르면 after가 던진다 — 그때는 저장하지 않는다.
  }

  return courses;
}

interface ComposedCourse {
  days: ItineraryDay[];
  // 검증을 통과하지 못한 채 남은 문제를 사용자에게 알리는 문구.
  notice?: string;
}

/**
 * 코스를 구성하고 검증한다. 배정된 시간에 닫혀 있는 장소가 있으면 그 장소를 제외하고
 * 다시 구성한다. 코스가 성립하지 않으면(빈 일정) null.
 */
async function composeValidated(params: {
  durationDays: number;
  tags: string[];
  requirePetFriendly?: boolean;
  offset: number;
  visitWeekday?: number;
}): Promise<ComposedCourse | null> {
  const { visitWeekday, ...composeParams } = params;
  const excluded = new Set<string>();
  let last: { days: ItineraryDay[]; result: ValidationResult } | null = null;

  for (let attempt = 1; attempt <= MAX_VALIDATION_ATTEMPTS; attempt += 1) {
    // composeItinerary가 이 집합에 고른 장소를 더하므로 시도마다 새로 만들어 넘긴다.
    const days = await composeItinerary({ ...composeParams, usedPlaceIds: new Set(excluded) });
    const result = validateItinerary(days, { visitWeekday });
    if (result.fatal) return null;
    if (result.approved) return { days };

    last = { days, result };
    const before = excluded.size;
    for (const placeId of result.rejectPlaceIds) excluded.add(placeId);
    // 제외 목록이 늘지 않으면 대체 후보가 없다는 뜻 — 다시 구성해도 같은 코스가 나온다.
    if (excluded.size === before) break;
  }

  if (!last) return null;
  return { days: last.days, notice: hoursNotice(last.result) };
}

function hoursNotice(result: ValidationResult): string {
  const names = [...new Set(result.issues.map((issue) => issue.placeName))];
  return `${names.join(", ")} — 방문 시간에 문을 닫을 수 있어요. 가기 전에 확인해 주세요.`;
}
