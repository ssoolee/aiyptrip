import { generateJson } from "@/lib/llm";
import { PLACE_TAGS, PlaceTag, isPlaceTag } from "@/lib/placeTags";

// docs/agents/01-orchestrator-agent.md "자연어 요청 해석" 참조.
// "비 오는 날 아이랑 조용한 곳" 같은 문장을 코스 생성 조건(취향 태그·일정·
// 반려동물 동반)으로 바꾼다. 태그는 장소 스냅샷과 같은 어휘(src/lib/placeTags.ts)
// 로만 뽑아야 점수에 반영된다. LLM이 실패하면 키워드 규칙으로 해석한다.

export interface TripConditions {
  tags: PlaceTag[];
  durationDays: number;
  requirePetFriendly: boolean;
  // 코스 제목 생성에 쓰는 동행 표현 (예: "아이와 함께")
  companionLabel: string;
  // 화면에 "이렇게 이해했어요"로 보여줄 항목들
  highlights: string[];
  source: "llm" | "rules";
}

export const MAX_QUERY_LENGTH = 100;
const DEFAULT_DURATION_DAYS = 2;

// 같은 문장은 "더 보기"마다 다시 해석하지 않는다 (무료 등급 호출 한도 절약).
const cache = new Map<string, TripConditions>();

const TAG_LABELS: Record<PlaceTag, string> = {
  healing: "힐링",
  quiet_cafe: "조용한 카페",
  view_cafe: "뷰 카페",
  nature: "자연",
  romantic: "데이트",
  photo_spot: "사진 명소",
  aesthetic: "감성",
  experience: "체험",
  kid_friendly: "아이 동반",
  activity: "액티비티",
  lively_food: "왁자지껄 맛집",
  group: "단체",
  local_food: "향토 음식",
  indoor: "실내 위주",
};

export async function interpretRequest(rawQuery: string): Promise<TripConditions> {
  const query = rawQuery.trim().slice(0, MAX_QUERY_LENGTH);
  const cached = cache.get(query);
  if (cached) return cached;

  const conditions = (await interpretWithLlm(query)) ?? interpretWithRules(query);
  cache.set(query, conditions);
  return conditions;
}

const SYSTEM =
  "당신은 경기도 양평군 여행 코스 추천 서비스의 요청 해석기입니다. 사용자의 문장을 " +
  "코스 생성 조건으로 바꿉니다. 문장에 드러난 것만 반영하고, 언급되지 않은 취향을 추측해 넣지 마세요.\n\n" +
  `사용 가능한 태그:\n${Object.entries(PLACE_TAGS)
    .map(([tag, description]) => `- ${tag}: ${description}`)
    .join("\n")}`;

async function interpretWithLlm(query: string): Promise<TripConditions | null> {
  const result = await generateJson<{
    tags?: unknown;
    durationDays?: unknown;
    petFriendly?: unknown;
    companion?: unknown;
  }>({
    system: SYSTEM,
    prompt:
      `사용자 요청: "${query}"\n\n` +
      `{"tags": [...], "durationDays": 2, "petFriendly": false, "companion": "..."} 형식으로 답하세요.\n` +
      `- tags: 위 목록의 태그만, 최대 4개 (비·장마·실내 언급은 indoor)\n` +
      `- durationDays: 당일=1, 1박2일=2, 2박3일=3. 언급이 없으면 ${DEFAULT_DURATION_DAYS}\n` +
      `- petFriendly: 반려동물 동반을 원하면 true\n` +
      `- companion: 동행을 "아이와 함께", "연인과 함께"처럼 짧게. 언급이 없으면 "양평 여행"`,
    maxTokens: 512,
  });
  if (!result) return null;

  const tags = Array.isArray(result.tags)
    ? [...new Set(result.tags.filter((t): t is PlaceTag => typeof t === "string" && isPlaceTag(t)))].slice(0, 4)
    : [];
  const durationDays =
    typeof result.durationDays === "number" && [1, 2, 3].includes(result.durationDays)
      ? result.durationDays
      : DEFAULT_DURATION_DAYS;
  const companion =
    typeof result.companion === "string" && result.companion.trim() && result.companion.length <= 20
      ? result.companion.trim()
      : "양평 여행";
  return build(tags, durationDays, result.petFriendly === true, companion, "llm");
}

// LLM 미설정·실패 시의 키워드 규칙. 자주 쓰는 표현만 다룬다.
const KEYWORD_RULES: [RegExp, PlaceTag[]][] = [
  // "비"만으로 찾으면 "바비큐"·"비싼"까지 걸려 비가 오는 표현으로 좁힌다.
  [/비 ?오|비가|비 내|장마|우천|실내|추운|더운/, ["indoor"]],
  [/아이|아기|애들|자녀|가족|키즈/, ["kid_friendly", "experience"]],
  [/조용|한적|여유|쉬|힐링|혼자/, ["healing", "quiet_cafe"]],
  // "강"만으로 찾으면 "강아지"가 걸린다.
  [/자연|숲|계곡|강변|강가|한강|산책|트레킹/, ["nature"]],
  [/데이트|연인|커플|여자친구|남자친구|로맨틱/, ["romantic", "aesthetic"]],
  [/사진|인스타|감성/, ["photo_spot", "aesthetic"]],
  [/뷰|전망|경치/, ["view_cafe"]],
  [/체험|만들기|농장/, ["experience"]],
  [/레포츠|액티비티|래프팅|캠핑|놀거리/, ["activity"]],
  [/친구|단체|모임|워크숍/, ["group", "lively_food"]],
  [/고기|바베큐|바비큐|술/, ["lively_food"]],
  [/향토|토속|로컬|전통 음식|막국수|해장국/, ["local_food"]],
];

function interpretWithRules(query: string): TripConditions {
  const tags = new Set<PlaceTag>();
  for (const [pattern, ruleTags] of KEYWORD_RULES) {
    if (pattern.test(query)) ruleTags.forEach((t) => tags.add(t));
  }
  const durationDays = /당일|하루|반나절/.test(query)
    ? 1
    : /2박|2박3일|2박 3일/.test(query)
      ? 3
      : DEFAULT_DURATION_DAYS;
  const pet = /반려|강아지|댕댕|애견|고양이|펫/.test(query);
  const companion = /아이|아기|애들|자녀|가족/.test(query)
    ? "아이와 함께"
    : /연인|커플|데이트/.test(query)
      ? "연인과 함께"
      : /친구/.test(query)
        ? "친구와 함께"
        : /혼자/.test(query)
          ? "혼자 여행"
          : pet
            ? "반려동물과 함께"
            : "양평 여행";
  return build([...tags].slice(0, 4), durationDays, pet, companion, "rules");
}

function build(
  tags: PlaceTag[],
  durationDays: number,
  requirePetFriendly: boolean,
  companionLabel: string,
  source: TripConditions["source"],
): TripConditions {
  const highlights = [
    durationDays === 1 ? "당일치기" : `${durationDays - 1}박 ${durationDays}일`,
    ...(requirePetFriendly ? ["반려동물 동반"] : []),
    ...tags.map((t) => TAG_LABELS[t]),
  ];
  return { tags, durationDays, requirePetFriendly, companionLabel, highlights, source };
}
