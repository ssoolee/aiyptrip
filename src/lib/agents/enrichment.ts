import { Course, ItineraryDay, PresetType } from "@/types/travel";
import { getTourApiOverview } from "@/lib/api/tourApi";
import { generateJson } from "@/lib/llm";
import { courseSignature } from "@/lib/courseSignature";

// docs/agents/05-enrichment-presentation-agent.md 참조.
// 트립 타이틀과 TourAPI 장소 소개 요약을 LLM(src/lib/llm) 한 번의 호출로 생성한다
// (무료 등급 호출 한도 절약). 키 미설정·실패 시 규칙 기반 결과로 fallback.
// 목업 장소는 이미 큐레이션된 reviewSummary를 갖고 있으므로 건드리지 않는다.

const SUMMARY_MAX_LENGTH = 80;
const FALLBACK_SUMMARY_LENGTH = 60;

// 같은 장소의 요약·같은 코스의 제목은 요청마다 다시 만들 필요가 없으므로 서버
// 메모리에 보관한다. 프리셋별 첫 코스들은 항상 같게 구성되므로 캐시 적중률이 높고,
// LLM 무료 등급의 분당 호출 한도(15 RPM)를 아끼는 핵심 수단이다.
// 서버 재시작 시 비워지며, Firestore 캐시 도입 전까지의 임시 방편.
const summaryCache = new Map<string, string>();
const titleCache = new Map<string, string>(); // key: 프리셋 + 동행 표현 + 코스 서명

export async function enrichCourse(params: {
  days: ItineraryDay[];
  presetType: PresetType;
  // 제목에 쓰는 동행 표현 — 프리셋 이름(예: "연인과 함께") 또는 자연어 해석 결과
  label: string;
  courseId: string;
  // 검증 에이전트가 남긴 주의사항 (docs/agents/04-validation-agent.md "실패/재시도 처리")
  notice?: string;
}): Promise<Course> {
  const { presetType, label, courseId, notice } = params;

  // placeId → TourAPI 소개 원문 (요약이 아직 없는 TourAPI 장소만)
  const overviews = new Map<string, string>();
  await Promise.all(
    params.days
      .flatMap((d) => d.stops)
      .filter((s) => !s.reviewSummary && s.placeId.startsWith("tour_") && !summaryCache.has(s.placeId))
      .map(async (s) => {
        const overview = await getTourApiOverview(s.placeId.slice("tour_".length));
        if (overview) overviews.set(s.placeId, overview);
      }),
  );

  const titleKey = `${presetType}:${label}:${courseSignature(params.days)}`;
  const cachedTitle = titleCache.get(titleKey);
  const generated =
    cachedTitle && overviews.size === 0
      ? { title: cachedTitle, summaries: {} }
      : await generateTitleAndSummaries(params.days, label, overviews);
  // 요약 때문에 다시 호출했더라도 한 번 정해진 제목은 바꾸지 않는다.
  const title = cachedTitle ?? generated?.title;
  if (title) titleCache.set(titleKey, title);
  for (const [placeId, summary] of Object.entries(generated?.summaries ?? {})) {
    summaryCache.set(placeId, summary);
  }

  const days: ItineraryDay[] = params.days.map((day) => ({
    ...day,
    stops: day.stops.map((stop) => {
      if (stop.reviewSummary) return stop;
      const overview = overviews.get(stop.placeId);
      const summary = summaryCache.get(stop.placeId) ?? (overview && truncate(overview, FALLBACK_SUMMARY_LENGTH));
      return summary ? { ...stop, reviewSummary: summary } : stop;
    }),
  }));

  const highlight = days[0]?.stops[0]?.name ?? "양평";
  const fallbackTitle = `${label} 코스: ${withJosa(highlight, "와", "과")} 함께하는 ${days.length}일 여행`;

  return {
    courseId,
    title: title ?? fallbackTitle,
    presetType,
    days,
    source: "generated",
    // undefined를 넣으면 Firestore 저장이 거부된다 — 값이 있을 때만 필드를 만든다.
    ...(notice ? { notice } : {}),
  };
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

// 마지막 글자의 받침 유무로 조사를 고른다 (예: 양평+와 → "양평과", 카페+와 → "카페와").
// 한글이 아닌 글자로 끝나면 받침을 판별할 수 없어 받침 없는 형태를 쓴다.
function withJosa(word: string, withoutBatchim: string, withBatchim: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  const hasBatchim = code >= 0 && code <= 11171 && code % 28 !== 0;
  return `${word}${hasBatchim ? withBatchim : withoutBatchim}`;
}

const SYSTEM =
  "당신은 경기도 양평군 여행 코스 에디터입니다. 주어진 코스의 동선을 보고 " +
  "여행자가 끌릴 만한 한국어 코스 제목을 짓고, 요청된 장소의 소개글을 요약합니다. " +
  "근거는 입력으로 받은 동행 유형, 일정, 장소 이름·태그, 소개글뿐입니다. " +
  "장소 이름이 암시하더라도 태그에 없는 특징(예: 반려동물 동반)은 쓰지 말고, " +
  "소개글에 없는 사실(영업시간, 가격, 평점 등)을 지어내지 마세요.";

// 제목에 반려동물 표현이 있는데 코스에 동반 가능 장소가 없으면 사실과 다른
// 제목이므로 버린다 — 프롬프트만으로는 막을 수 없는 경우를 코드로 한 번 더 거른다.
const PET_WORDS = /반려|댕댕|강아지|애견|멍멍|펫/;

interface Generated {
  title?: string;
  summaries: Record<string, string>;
}

// LLM 미설정·실패 시 null. 부분 실패(제목만 부적합 등)는 해당 항목만 비운다.
async function generateTitleAndSummaries(
  days: ItineraryDay[],
  presetLabel: string | undefined,
  overviews: Map<string, string>,
): Promise<Generated | null> {
  const stops = days.flatMap((d) => d.stops);
  const route = days
    .map(
      (d) =>
        `${d.day}일차: ${d.stops
          .map((s) => {
            const tags = [...new Set([...s.tags, ...(s.petFriendly ? ["pet_friendly"] : [])])];
            return `${s.name}(${s.category}${tags.length ? `; 태그: ${tags.join(", ")}` : ""})`;
          })
          .join(" → ")}`,
    )
    .join("\n");

  // 모델이 placeId를 잘못 옮겨 쓰지 않도록 짧은 키(p1, p2…)로 주고받는다.
  const keyed = [...overviews.entries()].map(([placeId, overview], i) => ({
    key: `p${i + 1}`,
    placeId,
    name: stops.find((s) => s.placeId === placeId)?.name ?? "",
    overview: truncate(overview, 600),
  }));
  const summarySection = keyed.length
    ? `\n\n요약할 장소 소개글:\n${keyed.map((k) => `[${k.key}] ${k.name}: ${k.overview}`).join("\n")}\n\n` +
      `각 장소를 여행자 관점에서 40자 안팎의 한 문장으로 요약해 "summaries"에 키별로 넣으세요.`
    : "";

  const result = await generateJson<{ title?: unknown; summaries?: Record<string, unknown> }>({
    system: SYSTEM,
    prompt:
      `동행 유형: ${presetLabel ?? "일반"}\n일정: ${days.length}일\n${route}${summarySection}\n\n` +
      `25자 이내 코스 제목을 "title"에 넣어 ` +
      (keyed.length ? `{"title": "...", "summaries": {"p1": "...", ...}}` : `{"title": "..."}`) +
      ` 형식으로 답하세요.`,
    maxTokens: 1024 + keyed.length * 200,
  });
  if (!result) return null;

  let title = typeof result.title === "string" ? result.title.trim() : undefined;
  if (title && (title.length > 40 || (PET_WORDS.test(title) && !stops.some((s) => s.petFriendly)))) {
    title = undefined;
  }

  const summaries: Record<string, string> = {};
  for (const { key, placeId } of keyed) {
    const summary = result.summaries?.[key];
    if (typeof summary === "string" && summary.trim() && summary.trim().length <= SUMMARY_MAX_LENGTH) {
      summaries[placeId] = summary.trim();
    }
  }

  return { title: title || undefined, summaries };
}
