import CourseDetailScreen from "@/components/CourseDetailScreen";
import { loadCourse } from "@/lib/courseStore";
import { findCuratedCourse } from "@/lib/mbti";

// 코스 상세 — 지도 동선과 일정을 한 화면에서 본다 (docs/prd/02-map-realtime-location-prd.md).
// 코스를 찾는 순서: ① 큐레이션(ID 고정) ② 서버에 저장된 생성 코스(src/lib/courseStore.ts)
// ③ 화면에서 찜 목록·세션 저장소(src/lib/courseCache.ts). 서버 저장은 자격증명이 없으면
// 건너뛰므로, 로컬에서도 ③으로 열린다.
export default async function CourseDetailPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const course = findCuratedCourse(courseId) ?? (await loadCourse(courseId)) ?? undefined;
  return <CourseDetailScreen courseId={courseId} initialCourse={course} />;
}
