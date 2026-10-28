import { redirect } from "next/navigation";
import { generateCourses } from "@/lib/agents/orchestrator";
import { interpretRequest, MAX_QUERY_LENGTH } from "@/lib/agents/requestInterpreter";
import CourseResults from "@/components/CourseResults";
import PageHeader from "@/components/PageHeader";
import TripSearchBox from "@/components/TripSearchBox";

// docs/prd/01-ai-course-recommendation-prd.md — 자연어 요청으로 코스 추천.
// /course/[preset]보다 정적 세그먼트 "search"가 우선 매칭된다.
export default async function CourseSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { q } = await searchParams;
  const query = (Array.isArray(q) ? q[0] : q)?.trim().slice(0, MAX_QUERY_LENGTH);
  if (!query) redirect("/");

  const conditions = await interpretRequest(query);
  const initialCourses = await generateCourses({ presetType: "custom", count: 3, conditions });

  return (
    <div className="mx-auto max-w-2xl pb-6 pt-6">
      <PageHeader
        className="mb-4 px-4"
        backHref="/"
        backLabel="처음으로"
        title={<>&ldquo;{query}&rdquo;</>}
        expression="wow"
      >
        <p className="mt-2 text-xs text-[var(--color-muted)]">이렇게 이해했어요</p>
        <ul className="mt-1 flex flex-wrap gap-1.5">
          {conditions.highlights.map((highlight) => (
            <li
              key={highlight}
              className="rounded-full bg-[var(--color-primary)]/10 px-2.5 py-0.5 text-xs font-medium text-[var(--color-primary)]"
            >
              {highlight}
            </li>
          ))}
        </ul>
        {conditions.tags.includes("indoor") && (
          <p className="mt-2 text-xs text-[var(--color-muted)]">
            양평은 실내 관광지가 많지 않아, 뒤쪽 코스에는 야외 장소가 포함될 수 있어요.
          </p>
        )}
        {conditions.requirePetFriendly && (
          <p className="mt-2 text-xs text-[var(--color-muted)]">
            반려동물 동반 가능 업소 현황에 등록됐거나 소개글에 동반 가능이 명시된 곳만 담았어요. 방문 전 동반 조건을 꼭 확인하세요.
          </p>
        )}
        {conditions.tags.length === 0 && !conditions.requirePetFriendly && (
          <p className="mt-2 text-xs text-[var(--color-muted)]">
            특별한 취향을 찾지 못해 인기 장소 위주로 추천했어요. 누구와, 어떤 분위기를 원하는지 적어주시면 더 잘 맞춰드려요.
          </p>
        )}
      </PageHeader>
      <div className="mb-5">
        <TripSearchBox defaultValue={query} />
      </div>
      <CourseResults key={query} presetType="custom" initialCourses={initialCourses} query={query} />
    </div>
  );
}
