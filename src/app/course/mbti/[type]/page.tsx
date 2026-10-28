import { notFound } from "next/navigation";
import { generateCourses } from "@/lib/agents/orchestrator";
import { getMbtiCuration, isMbtiType } from "@/lib/mbti";
import CourseResults from "@/components/CourseResults";
import PageHeader from "@/components/PageHeader";
import LodgingPicks from "@/components/LodgingPicks";

// MBTI 유형별 코스: 미리 만들어 둔 큐레이션 코스(src/lib/data/mbtiCourses.json)를
// 먼저 보여주고, "더 보기"는 에이전트 파이프라인으로 같은 성향의 코스를 이어서 만든다.
export default async function MbtiCoursePage({ params }: { params: Promise<{ type: string }> }) {
  const type = (await params).type.toUpperCase();
  if (!isMbtiType(type)) notFound();

  const curation = getMbtiCuration(type);
  // 아직 큐레이션 자료가 없는 유형은 파이프라인 코스로 대신한다.
  const initialCourses =
    curation.courses.length > 0 ? curation.courses : await generateCourses({ presetType: "mbti", count: 3, mbti: type });

  return (
    <div className="mx-auto max-w-2xl pb-6 pt-6">
      <PageHeader
        className="mb-4 px-4"
        backHref="/course/mbti"
        backLabel="다른 MBTI 고르기"
        title={`${type} 성향 맞춤 양평 코스`}
        description={curation.summary || undefined}
        expression="happy"
      />
      <CourseResults key={type} presetType="mbti" initialCourses={initialCourses} mbti={type} />
      <LodgingPicks title={`${type}에게 어울리는 숙소·펜션`} picks={curation.lodging} />
    </div>
  );
}
