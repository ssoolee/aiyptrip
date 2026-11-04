// 실행: npm test
//
// 커밋된 혼자 여행 코스의 소개글이 **지금 일정과 맞는지** 본다.
//
// 소개글에는 시각과 소요시간이 들어 있는데(서울 출발·복귀, 이동 시간 합계) 그 숫자는
// 화면에서 다시 계산된다(src/lib/curation.ts). 그래서 구간 이동시간이 바뀌면 —
// npm run build:routes로 실측값을 새로 받으면 — 얼려 둔 글만 옛 숫자에 남는다.
// 실제로 그랬다: 머리말은 "20:05 복귀"인데 소개글은 "19:15에 돌아옵니다"였다.
//
// 고치는 명령은 npm run build:reasons다 (LLM을 부르지 않는다).
import assert from "node:assert/strict";
import { test } from "node:test";
import { fallbackReason } from "@/lib/agents/courseReason";
import { rehydrateCourse } from "@/lib/curation";
import { soloThemeOf } from "@/lib/soloThemes";
import soloCourses from "@/lib/data/soloCourses.json";
import type { Course } from "@/types/travel";

const CURATED: Course[] = Object.values(
  soloCourses.durations as Record<string, Course[]>,
).flat();

test("커밋된 소개글이 지금 일정과 맞는다", () => {
  const stale: string[] = [];
  for (const course of CURATED) {
    const fresh = fallbackReason(rehydrateCourse(course).days, soloThemeOf(course.courseId)?.lead);
    if (fresh !== course.reason) stale.push(course.courseId);
  }
  assert.deepEqual(stale, [], `소개글이 낡았다 — npm run build:reasons를 실행하세요`);
});

test("소개글의 복귀 시각이 일정의 복귀 시각과 같다", () => {
  // 같은 화면에 두 숫자가 함께 나온다 — 머리말의 "→ 20:05 복귀"와 소개글의 마지막 문장.
  for (const course of CURATED) {
    const days = rehydrateCourse(course).days;
    const arriveAt = days[days.length - 1]?.arrival?.at;
    if (!arriveAt) continue;
    assert.ok(
      course.reason?.includes(`${arriveAt}에 서울로 돌아옵니다`),
      `${course.courseId}: 일정은 ${arriveAt} 복귀인데 소개글이 다르다 — ${course.reason}`,
    );
  }
});

test("소개글의 조사가 숫자 뒤에서 어긋나지 않는다", () => {
  // "10시간를 씁니다"가 나오던 자리. 받침으로 조사를 고른다(courseReason.ts의 josa).
  for (const course of CURATED) {
    assert.ok(!/시간를|분를/.test(course.reason ?? ""), `${course.courseId}: ${course.reason}`);
  }
});

test("테마 키를 courseId에서 되찾을 수 있다", () => {
  for (const course of CURATED) {
    assert.ok(soloThemeOf(course.courseId), `${course.courseId}의 테마를 못 찾는다`);
  }
  assert.equal(soloThemeOf("mbti_ESTJ_curated_1"), undefined);
});
