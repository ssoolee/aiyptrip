import { PresetDefinition } from "@/types/travel";

// docs/prd/01-ai-course-recommendation-prd.md §3의 프리셋 중 화면에 남긴 3종.
// 연인·가족·친구·축제는 내렸다 — README "코스 유형 3종" 참조.
export const PRESETS: PresetDefinition[] = [
  {
    type: "solo",
    label: "혼자 여행",
    emoji: "🧘",
    description: "힐링과 사색을 위한 조용한 코스",
    tags: ["healing", "quiet_cafe", "nature"],
  },
  {
    type: "pet",
    label: "반려동물과 함께",
    emoji: "🐶",
    description: "반려동물 동반 가능 업체만 모은 코스",
    tags: ["pet_friendly"],
  },
  {
    type: "mbti",
    label: "MBTI 성향별",
    emoji: "🔤",
    description: "내 성향에 맞는 코스 추천",
    tags: [],
  },
];

/**
 * 코스를 미리 만들어 커밋해 둔 유형. 나머지는 화면을 열 때 실시간으로 생성한다.
 *
 * 다국어에서 쓴다 — 생성 글은 한국어로만 나오므로(프롬프트·글자 수 제한·조사 처리가
 * 한국어에 묶여 있다) 외국어에서는 이 둘만 연다. "pet"을 이름으로 박지 않는 이유는
 * 나중에 반려동물 코스를 미리 만들어 커밋하면 그때 여기 들어오면 되기 때문이다.
 */
export const CURATED_PRESETS: readonly string[] = ["solo", "mbti"];

export function getPreset(type: string): PresetDefinition | undefined {
  return PRESETS.find((p) => p.type === type);
}
