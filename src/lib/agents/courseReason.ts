import { DWELL_MINUTES, formatDuration } from "@/lib/agents/schedule";
import { Category, ItineraryDay } from "@/types/travel";

// "왜 이 코스를 추천했는가"를 200자 안팎으로 적는다.
//
// 글은 LLM이 쓰지만(src/lib/agents/enrichment.ts에서 코스 제목과 한 번에 요청한다),
// 키가 없거나 호출이 실패해도 설명이 비지 않도록 규칙 기반 문장을 먼저 만들어 둔다.
// 둘 다 같은 사실만 쓴다 — 서울 출발·복귀 시각, 머무는 시간과 이동 시간의 비율,
// 코스의 구성. 영업시간·가격·평점처럼 코스가 모르는 사실은 쓰지 않는다.

/** 추천 이유의 목표 길이. 카드에 서너 줄로 들어가는 분량. */
export const REASON_TARGET_LENGTH = 200;
export const REASON_MAX_LENGTH = 230;


/** 코스가 품은 사실들 — 규칙 기반 문장과 LLM 프롬프트가 같은 숫자를 쓰도록 한 곳에서 센다. */
export interface CourseFacts {
  days: number;
  departAt?: string;
  arriveAt?: string;
  firstStop?: string;
  firstArrival?: string;
  lodging?: string;
  counts: Partial<Record<Category, number>>;
  travelMinutes: number;
  stayMinutes: number;
}

export function courseFacts(days: ItineraryDay[]): CourseFacts {
  const stops = days.flatMap((day) => day.stops);
  const counts: Partial<Record<Category, number>> = {};
  let travelMinutes = 0;
  let stayMinutes = 0;
  for (const stop of stops) {
    counts[stop.category] = (counts[stop.category] ?? 0) + 1;
    travelMinutes += stop.travelMinutes ?? 0;
    stayMinutes += DWELL_MINUTES[stop.category];
  }
  const lastDay = days[days.length - 1];
  travelMinutes += lastDay?.arrival?.minutes ?? 0;

  return {
    days: days.length,
    departAt: days[0]?.departure?.at,
    arriveAt: lastDay?.arrival?.at,
    firstStop: stops[0]?.name,
    firstArrival: stops[0]?.timeSlot.split("-")[0] || undefined,
    lodging: stops.find((stop) => stop.category === "lodging")?.name,
    counts,
    travelMinutes,
    stayMinutes,
  };
}

// 받침 유무로 조사를 고른다 (양평+을 → "양평을", 카페+을 → "카페를").
function josa(word: string, withBatchim: string, withoutBatchim: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  const hasBatchim = code >= 0 && code <= 11171 && code % 28 !== 0;
  return `${word}${hasBatchim ? withBatchim : withoutBatchim}`;
}

const NATIVE_NUMERALS = ["", "한", "두", "세", "네", "다섯", "여섯", "일곱", "여덟", "아홉", "열"];

function countWord(count: number, unit: string): string {
  return `${NATIVE_NUMERALS[count] ?? count} ${unit}`;
}

/** "볼거리 두 곳에 밥 두 끼, 카페 한 곳" — 숙소는 따로 문장으로 말하므로 뺀다. */
function describeShape(counts: Partial<Record<Category, number>>): string {
  const parts: string[] = [];
  if (counts.attraction) parts.push(`볼거리 ${countWord(counts.attraction, "곳")}`);
  if (counts.restaurant) parts.push(`밥 ${countWord(counts.restaurant, "끼")}`);
  if (counts.cafe) parts.push(`카페 ${countWord(counts.cafe, "곳")}`);
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join("에 ")}, ${parts[parts.length - 1]}`;
}

// 한 화면에 코스 카드가 여섯 장 깔리는데 설명이 전부 같은 문장이면 읽히지 않는다.
// 코스마다 다른(그러나 항상 같은) 어투를 고르도록, 코스의 첫 스팟 이름으로 변형을 뽑는다.
function variantIndex(seed: string, count: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) % 100003;
  return hash % count;
}

const SHAPE_SENTENCES = [
  (character: string, shape: string) => `${character}라, ${josa(shape, "을", "를")} 동선이 겹치지 않는 순서로 이었습니다.`,
  (character: string, shape: string) => `${character}입니다. ${josa(shape, "을", "를")} 가까운 것끼리 묶어 돌도록 놓았습니다.`,
  (character: string, shape: string) => `${character}로, ${josa(shape, "을", "를")} 이동이 짧은 순서대로 이어 놓았습니다.`,
];

const BALANCE_SENTENCES = [
  (travel: string, stay: string) => `길 위에 있는 시간은 다 합쳐 ${travel}, 어딘가에 머무는 시간은 ${stay}입니다.`,
  (travel: string, stay: string) => `오가는 데 ${travel}, 한곳에 머무는 데 ${stay}를 씁니다.`,
  (travel: string, stay: string) => `이동에 ${travel}, 머무는 데 ${stay} — 운전은 생각보다 적습니다.`,
];

/**
 * LLM 없이도 쓸 수 있는 추천 이유. 코스에서 바로 읽히는 사실만 이어 붙인다 —
 * 서울에서 나서는 시각, 첫 스팟에 닿는 시각, 코스의 구성, 길 위에 있는 시간과
 * 머무는 시간의 비율, 돌아오는 시각. 키가 없으면 이 문장이 그대로 화면에 간다.
 *
 * @param lead 테마 한 줄 설명(src/lib/soloThemes.ts). 없으면 일정 길이로 대신한다.
 */
export function fallbackReason(days: ItineraryDay[], lead?: string): string {
  const facts = courseFacts(days);
  const seed = facts.firstStop ?? String(facts.days);
  const sentences: string[] = [];

  if (facts.departAt && facts.firstStop && facts.firstArrival) {
    sentences.push(`서울에서 ${facts.departAt}에 나서면 ${facts.firstArrival}에 ${facts.firstStop} 앞입니다.`);
  }

  const shape = describeShape(facts.counts);
  const character =
    lead ??
    (facts.days > 1
      ? `${facts.days - 1}박 ${facts.days}일 동안 쉬엄쉬엄 도는 코스`
      : "하루에 양평을 한 바퀴 도는 코스");
  sentences.push(
    shape
      ? SHAPE_SENTENCES[variantIndex(seed, SHAPE_SENTENCES.length)](character, shape)
      : `${character}입니다.`,
  );

  if (facts.lodging) {
    sentences.push(`첫날은 ${facts.lodging}에서 묵고, 이튿날은 10시에 체크아웃하고 다시 나섭니다.`);
  }

  if (facts.travelMinutes > 0) {
    sentences.push(
      BALANCE_SENTENCES[variantIndex(seed, BALANCE_SENTENCES.length)](
        formatDuration(facts.travelMinutes),
        formatDuration(facts.stayMinutes),
      ),
    );
  }

  if (facts.arriveAt) {
    sentences.push(`${facts.arriveAt}에 서울로 돌아옵니다.`);
  }

  // 하루 코스는 여기까지 180자 안팎이라 한마디 더 붙일 자리가 있다. 1박 2일은
  // 숙소 문장이 들어가 이미 200자에 닿으므로 붙이지 않는다.
  const body = sentences.join(" ");
  if (facts.stayMinutes >= facts.travelMinutes * 2 && body.length <= REASON_TARGET_LENGTH - 25) {
    sentences.splice(sentences.length - 1, 0, "운전대보다 의자에 앉아 있는 시간이 훨씬 깁니다.");
  }

  return trimReason(sentences.join(" "));
}

/** 너무 길면 문장 단위로 끊는다 — 말이 중간에 잘리지 않게. */
export function trimReason(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= REASON_MAX_LENGTH) return clean;
  const cut = clean.slice(0, REASON_MAX_LENGTH);
  const lastStop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("다."), cut.lastIndexOf("요."));
  return lastStop > REASON_TARGET_LENGTH / 2 ? cut.slice(0, lastStop + 2).trim() : `${cut.trim()}…`;
}

/** LLM에게 줄 사실 요약 — 모델이 숫자를 지어내지 않도록 계산해 둔 값만 넘긴다. */
export function reasonFactSheet(days: ItineraryDay[]): string {
  const facts = courseFacts(days);
  const lines = [
    `일정: ${facts.days}일`,
    facts.departAt ? `서울 출발: ${facts.departAt}` : null,
    facts.firstStop && facts.firstArrival ? `첫 스팟: ${facts.firstStop} ${facts.firstArrival} 도착` : null,
    facts.lodging ? `숙소: ${facts.lodging} (다음 날 10:00 체크아웃 출발)` : null,
    `구성: ${describeShape(facts.counts)}`,
    `이동 시간 합계: ${formatDuration(facts.travelMinutes)}`,
    `머무는 시간 합계: ${formatDuration(facts.stayMinutes)}`,
    facts.arriveAt ? `서울 복귀: ${facts.arriveAt}` : null,
  ];
  return lines.filter(Boolean).join("\n");
}
