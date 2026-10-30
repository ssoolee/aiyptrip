// 혼자 여행 테마 코스(src/lib/data/soloCourses.json)를 미리 만들어 둔다. 실행: npm run build:solo
//
// 혼자 여행 프리셋은 그동안 요청마다 파이프라인을 3번 돌려 코스 3개를 만들었다.
// 테마(src/lib/soloThemes.ts)별로 한 번씩 미리 뽑아 두면 ① 화면에 더 많은 코스를
// 생성 대기 없이 띄울 수 있고 ② 같은 조건이면 늘 같은 코스가 나와 "아까 본 그 코스"를
// 다시 찾을 수 있다 (PRD-01 §8 "사전 생성 코스 노출 지연 ≤ 0.5초").
//
// 장소의 영업시간·전화번호와 코스의 시각은 얼려 두지 않고 화면에서 다시 계산한다
// (src/lib/curation.ts) — 그래서 스냅샷을 새로 만들어도 이 파일을 다시 돌릴 필요는 없다.
import { loadEnvConfig } from "@next/env";
import { writeFileSync } from "node:fs";
import path from "node:path";
import type { Course } from "@/types/travel";

loadEnvConfig(process.cwd());

const OUTPUT = path.join(process.cwd(), "src/lib/data/soloCourses.json");

// Gemini 무료 등급은 분당 15회라, 코스마다 LLM을 두 번(요약·추천 이유) 부르는 동안
// 한 박자씩 쉰다. 빌드는 오프라인이라 느려도 상관없다.
const PAUSE_MS = 5000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  // env 로드 뒤에 import해야 모듈이 키를 읽는다.
  const { SOLO_THEMES, SOLO_DURATIONS, soloCourseId } = await import("@/lib/soloThemes");
  const { composeItinerary } = await import("@/lib/agents/itineraryComposer");
  const { enrichCourse } = await import("@/lib/agents/enrichment");
  const { courseSignature } = await import("@/lib/courseSignature");
  const { fallbackReason, reasonFactSheet, trimReason, REASON_TARGET_LENGTH } = await import(
    "@/lib/agents/courseReason"
  );
  const { generateJson } = await import("@/lib/llm");

  const durations: Record<string, Course[]> = {};

  for (const durationDays of SOLO_DURATIONS) {
    console.log(`\n[${durationDays === 1 ? "당일치기" : `${durationDays - 1}박 ${durationDays}일`}]`);
    const courses: Course[] = [];
    const seen = new Set<string>();
    // 한 일정 안에서는 테마끼리 장소를 나눠 쓴다. 태그만 다르게 줘서는 같은 곳으로
    // 수렴한다 — 관광지 40곳 중 23곳이 nature라, 테마 여섯 개가 모두 세미원에서
    // 시작하는 코스가 나왔다. 테마가 쓰는 장소는 많아야 관광지 12곳이라 여유가 있다.
    const usedPlaceIds = new Set<string>();

    for (const theme of SOLO_THEMES) {
      const days = await composeItinerary({ durationDays, tags: theme.tags, usedPlaceIds });
      if (days.length === 0) {
        console.log(`  ✗ ${theme.title} — 후보가 없어 건너뜀`);
        continue;
      }
      const signature = courseSignature(days);
      if (seen.has(signature)) {
        console.log(`  ✗ ${theme.title} — 앞 테마와 같은 코스라 건너뜀`);
        continue;
      }
      seen.add(signature);

      const courseId = soloCourseId(theme.key, durationDays);
      // 장소 소개 요약을 채우기 위해 파이프라인과 같은 enrichment를 거친다.
      // 제목과 추천 이유는 테마가 정해 두므로 여기서 덮어쓴다.
      const enriched = await enrichCourse({ days, presetType: "solo", label: "혼자 여행", courseId });
      await sleep(PAUSE_MS);

      const reason = await writeReason(theme.lead, enriched);
      await sleep(PAUSE_MS);

      courses.push({
        courseId,
        title: theme.title,
        presetType: "solo",
        days: enriched.days,
        source: "curated",
        reason,
      });
      console.log(`  ✓ ${theme.title} (${enriched.days.flatMap((d) => d.stops).length}곳, 이유 ${reason.length}자)`);
    }

    durations[String(durationDays)] = courses;
  }

  writeFileSync(
    OUTPUT,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), durations }, null, 1)}\n`,
    "utf8",
  );
  const total = Object.values(durations).reduce((sum, list) => sum + list.length, 0);
  console.log(`\n저장: ${path.relative(process.cwd(), OUTPUT)} (코스 ${total}개)`);

  // 추천 이유를 200자 안팎의 한국어로 쓴다. 실패하면 규칙 기반 문장을 쓴다.
  async function writeReason(lead: string, course: Course): Promise<string> {
    const route = course.days
      .map((d) => `${d.day}일차: ${d.stops.map((s) => `${s.name}(${s.category})`).join(" → ")}`)
      .join("\n");
    const result = await generateJson<{ reason?: unknown }>({
      system:
        "당신은 경기도 양평군 여행 코스 에디터입니다. 혼자 여행하는 사람에게 코스를 추천하는 " +
        "이유를 한국어로 씁니다. 주어진 동선과 사실만 근거로 쓰고, 영업시간·가격·평점처럼 " +
        "주어지지 않은 사실은 지어내지 마세요.",
      prompt:
        `테마: ${lead}\n코스 제목 후보: ${course.title}\n${route}\n\n` +
        `이 코스의 사실(지어내지 말고 이 값만 쓰세요):\n${reasonFactSheet(course.days)}\n\n` +
        `서울에서 혼자 출발하는 사람에게 이 코스를 추천하는 이유를 ${REASON_TARGET_LENGTH}자 안팎의 ` +
        `한국어 서너 문장으로 쓰고 {"reason": "..."} 형식으로 답하세요. 시각과 시간은 위 값을 ` +
        `그대로 쓰고, "최고", "꼭" 같은 과장이나 감탄사 없이 담백하게 적으세요.`,
      maxTokens: 1024,
      // 오프라인 빌드라 응답 시간에 매이지 않는다 — 기본 4초는 200자 생성에 짧다.
      timeoutMs: 60_000,
    });
    const reason = typeof result?.reason === "string" ? trimReason(result.reason) : "";
    return reason.length >= 60 ? reason : fallbackReason(course.days, lead);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
