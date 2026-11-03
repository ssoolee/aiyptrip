import data from "@/lib/data/soloCourses.json";
import { rehydrateCourse } from "@/lib/curation";
import { Course } from "@/types/travel";

// scripts/build-solo-courses.ts(npm run build:solo)가 테마별로 미리 만들어 둔
// 혼자 여행 코스. 일정 탭(당일치기=1, 1박 2일=2)별로 나눠 담겨 있다.
// 장소의 영업시간·코스의 시각은 여기서 다시 계산한다 (src/lib/curation.ts).

const DURATIONS = data.durations as Record<string, Course[]>;

export function getSoloCourses(durationDays: number, noticeTemplate?: string): Course[] {
  // map(rehydrateCourse)로 넘기면 두 번째 인자로 index가 들어간다 — 화살표로 감싼다.
  return (DURATIONS[String(durationDays)] ?? []).map((course) =>
    rehydrateCourse(course, noticeTemplate),
  );
}

// courseId는 "solo_water_1d_curated"처럼 고정이라, 코스 상세 화면이 URL만으로
// 다시 찾을 수 있다 (파이프라인 코스는 요청마다 새로 만들어져 불가능 —
// src/lib/courseCache.ts 참조).
const SOLO_COURSE_ID = /^solo_[a-z]+_(\d+)d_curated$/;

export function findCuratedSoloCourse(courseId: string, noticeTemplate?: string): Course | undefined {
  const match = SOLO_COURSE_ID.exec(courseId);
  if (!match) return undefined;
  return getSoloCourses(Number(match[1]), noticeTemplate).find(
    (course) => course.courseId === courseId,
  );
}
