import { PresetDefinition, ShownPresetType } from "@/types/travel";

// docs/prd/01-ai-course-recommendation-prd.md §3의 프리셋 중 화면에 남긴 3종.
// 연인·가족·친구·축제는 내렸다 — README "코스 유형 3종" 참조.
//
// 이름과 설명은 여기 두지 않는다 — 언어마다 다르므로 사전(presets.<type>)이 갖는다.
// 여기 남는 건 언어와 상관없는 값(그림문자·태그)뿐이다.
export const PRESETS: PresetDefinition[] = [
  { type: "solo", emoji: "🧘", tags: ["healing", "quiet_cafe", "nature"] },
  { type: "pet", emoji: "🐶", tags: ["pet_friendly"] },
  { type: "mbti", emoji: "🔤", tags: [] },
];

/**
 * 코스를 미리 만들어 커밋해 둔 유형. 나머지는 화면을 열 때 실시간으로 생성한다.
 *
 * 다국어에서 쓴다 — 생성 글은 한국어로만 나오므로(프롬프트·글자 수 제한·조사 처리가
 * 한국어에 묶여 있다) 외국어에서는 이 둘만 연다. "pet"을 이름으로 박지 않는 이유는
 * 나중에 반려동물 코스를 미리 만들어 커밋하면 그때 여기 들어오면 되기 때문이다.
 */
export const CURATED_PRESETS: readonly string[] = ["solo", "mbti"];

/**
 * 코스 생성 프롬프트에 넣는 유형 이름.
 *
 * 화면 사전(presets.<type>.label)과 일부러 따로 둔다 — 이건 사람이 읽는 글자가 아니라
 * LLM에 들어가는 입력이고, 코스 생성은 한국어 전용이라(src/lib/i18n/config.ts의
 * SEARCH_LOCALES) 언어를 따라가면 안 된다. 영어로 바꾸면 한국어로 쓰라고 시킨
 * 프롬프트 안에 영어 조각이 섞인다.
 */
export const PRESET_PROMPT_LABEL: Record<ShownPresetType, string> = {
  solo: "혼자 여행",
  pet: "반려동물과 함께",
  mbti: "MBTI 성향별",
};

export function getPreset(type: string): PresetDefinition | undefined {
  return PRESETS.find((p) => p.type === type);
}
