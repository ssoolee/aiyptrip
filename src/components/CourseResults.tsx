"use client";

import { useState, useTransition } from "react";
import CourseCard from "@/components/CourseCard";
import EmptyState from "@/components/EmptyState";
import { loadMoreCourses } from "@/lib/actions";
import { courseSignature } from "@/lib/courseSignature";
import { Course, PresetType } from "@/types/travel";

// 첫 화면과 "더 보기" 한 번에 생성하는 코스 수 (페이지·loadMoreCourses의 count와 같음)
const COURSES_PER_LOAD = 3;

export default function CourseResults({
  presetType,
  initialCourses,
  mbti,
  query,
  durationDays,
}: {
  presetType: PresetType;
  initialCourses: Course[];
  // MBTI 유형 화면(/course/mbti/[type]) — "더 보기" 때 이 성향으로 이어서 생성
  mbti?: string;
  // 자연어 요청(/course/search) — "더 보기" 때 같은 조건으로 이어서 생성
  query?: string;
  // 프리셋 화면의 일정 탭 — "더 보기"도 같은 일정으로 생성
  durationDays?: number;
}) {
  const [courses, setCourses] = useState(initialCourses);
  // 생성 파이프라인의 다음 offset. 요청마다 중복 제거 전 기준으로 COURSES_PER_LOAD개를
  // 소모하고, 큐레이션 코스는 파이프라인 후보를 쓰지 않으므로 courses.length로 세면 안 된다.
  const [nextOffset, setNextOffset] = useState(
    initialCourses.some((c) => c.source === "curated") ? 0 : COURSES_PER_LOAD,
  );
  // "더 보기"로 새 코스가 하나도 안 나오면 후보가 소진된 것 — 버튼 대신 안내 문구를 보여준다.
  const [exhausted, setExhausted] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleLoadMore = () => {
    startTransition(async () => {
      const more = await loadMoreCourses(presetType, nextOffset, mbti, query, durationDays);
      const shown = new Set(courses.map((c) => courseSignature(c.days)));
      const fresh = more.filter((c) => !shown.has(courseSignature(c.days)));
      if (fresh.length === 0) setExhausted(true);
      setNextOffset((n) => n + COURSES_PER_LOAD);
      setCourses((prev) => [...prev, ...fresh]);
    });
  };

  return (
    <div className="px-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {courses.map((course) => (
          <CourseCard key={course.courseId} course={course} />
        ))}
      </div>

      {courses.length === 0 && (
        <div className="py-10">
          <EmptyState
            expression="wow"
            message="조건에 맞는 코스를 찾지 못했어요. 조건을 조금 바꿔서 다시 알려주시겠어요?"
          />
        </div>
      )}

      {exhausted ? (
        <p className="mt-6 text-center text-sm text-[var(--color-muted)]">
          이 조건으로 만들 수 있는 코스를 모두 보여드렸어요.
        </p>
      ) : (
        <button
          type="button"
          onClick={handleLoadMore}
          disabled={isPending}
          className="mx-auto mt-6 block rounded-[var(--radius-button)] border border-[var(--color-primary)] px-6 py-2.5 text-sm font-semibold text-[var(--color-primary)] disabled:opacity-50"
        >
          {isPending ? "코스를 만드는 중..." : "다른 코스 더 보기"}
        </button>
      )}
    </div>
  );
}
