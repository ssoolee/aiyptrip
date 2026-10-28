"use client";

import { Course } from "@/types/travel";

// 추천 코스는 요청마다 새로 만들어지고 서버에 저장되지 않는다(src/lib/agents/orchestrator.ts).
// 코스 상세 화면이 URL만으로 코스를 다시 찾을 수 있도록, 사용자가 카드를 누른 코스를
// 세션 저장소에 잠깐 둔다. 찜한 코스는 src/lib/favorites.ts가 따로 보관하므로 여기 없어도 된다.
const STORAGE_KEY = "ypaicourse.course.recent";
// 세션 저장소는 보통 5MB라 넉넉하지만, 코스 하나가 사진 URL까지 들고 있어 개수를 제한한다.
const MAX_ENTRIES = 20;

// useSyncExternalStore의 getSnapshot은 같은 값에 같은 참조를 돌려줘야 한다
// (매번 JSON.parse하면 무한 렌더). 읽은 결과를 메모리에 붙들어 둔다.
const memo = new Map<string, Course | null>();

function readAll(): Record<string, Course> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, Course>) : {};
  } catch {
    return {};
  }
}

/** 코스 상세로 이동하기 직전에 호출한다. */
export function cacheCourse(course: Course): void {
  if (typeof window === "undefined") return;
  try {
    const all = readAll();
    delete all[course.courseId]; // 다시 넣어 가장 최근으로 만든다
    const entries = [...Object.entries(all), [course.courseId, course] as const].slice(-MAX_ENTRIES);
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(entries)));
    memo.set(course.courseId, course);
  } catch {
    // 세션 저장소를 못 쓰면(사생활 보호 모드 등) 캐시 없이 동작한다 — 상세 화면이 안내를 띄운다.
  }
}

export function readCachedCourse(courseId: string): Course | null {
  const remembered = memo.get(courseId);
  if (remembered !== undefined) return remembered;
  const found = readAll()[courseId] ?? null;
  memo.set(courseId, found);
  return found;
}
