// 커밋된 큐레이션 코스의 "왜 이 코스인가" 글을 지금 일정에 맞춰 다시 적는다.
// 실행: npm run build:reasons   (무엇이 바뀌는지만 보려면 --dry)
//
// **LLM을 부르지 않는다.** 이 글은 src/lib/agents/courseReason.ts의 fallbackReason()이
// 코스의 사실만으로 조립한 문장이라, 같은 일정을 넣으면 같은 글이 그대로 나온다.
//
// 왜 따로 돌려야 하나: 글 안에 시각과 소요시간이 들어 있는데(서울 출발·복귀, 이동 시간
// 합계), 그 숫자는 **화면에서 다시 계산된다**(src/lib/curation.ts의 rehydrateCourse).
// 그래서 구간 이동시간이 바뀌면 — npm run build:routes로 실측값을 새로 받거나
// `-- --force`로 소요시간을 다시 재면 — 얼려 둔 글만 옛 숫자에 남아 어긋난다.
// 실제로 어긋나 있었다: 머리말은 "20:05 복귀"인데 소개글은 "19:15에 돌아옵니다"였다.
//
// **build:routes를 돌렸으면 이것도 돌린다.** 잊어도 src/lib/soloCourses.test.ts가 잡는다.
//
// 코스를 통째로 다시 만드는 npm run build:solo와는 다르다. 저쪽은 장소·순서·제목까지
// LLM으로 새로 뽑으므로 큐레이션이 통째로 바뀐다. 여기는 글의 숫자만 맞춘다.
import { loadEnvConfig } from "@next/env";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Course } from "@/types/travel";

loadEnvConfig(process.cwd());

const SOLO_PATH = path.join(process.cwd(), "src/lib/data/soloCourses.json");

async function main() {
  const dry = process.argv.includes("--dry");
  // env 로드 뒤에 import한다 (다른 빌드 스크립트와 같은 규약).
  const { rehydrateCourse } = await import("@/lib/curation");
  const { fallbackReason } = await import("@/lib/agents/courseReason");
  const { soloThemeOf } = await import("@/lib/soloThemes");

  const file = JSON.parse(readFileSync(SOLO_PATH, "utf8")) as {
    generatedAt: string;
    durations: Record<string, Course[]>;
  };

  let changed = 0;
  let kept = 0;

  for (const courses of Object.values(file.durations)) {
    for (const course of courses) {
      // 테마 한 줄 설명이 글의 첫 문장 어투를 정한다. courseId에 테마 키가 들어 있다.
      // 되살린 일정 = 화면이 실제로 보여 주는 시각이다.
      const fresh = fallbackReason(rehydrateCourse(course).days, soloThemeOf(course.courseId)?.lead);

      if (fresh === course.reason) {
        kept++;
        continue;
      }
      changed++;
      console.log(`[${course.courseId}]`);
      console.log(`  전: ${course.reason ?? "(없음)"}`);
      console.log(`  후: ${fresh}`);
      if (!dry) course.reason = fresh;
    }
  }

  console.log(`\n그대로 ${kept}개 · 다시 적을 것 ${changed}개`);
  if (dry || changed === 0) {
    if (changed === 0) console.log("맞아 있다 — 파일을 그대로 둔다.");
    return;
  }

  writeFileSync(SOLO_PATH, `${JSON.stringify(file, null, 1)}\n`, "utf8");
  console.log(`${path.relative(process.cwd(), SOLO_PATH)} 저장`);
  console.log("한국어 원문이 바뀌었으니 번역도 다시 받는다: npm run build:i18n -- --locale en|ja|zh");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
