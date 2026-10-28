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

export function getPreset(type: string): PresetDefinition | undefined {
  return PRESETS.find((p) => p.type === type);
}
