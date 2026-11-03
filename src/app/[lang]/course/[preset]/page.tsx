import { notFound } from "next/navigation";
import LocaleLink from "@/components/LocaleLink";
import { getPreset } from "@/lib/presets";
import { generateCourses } from "@/lib/agents/orchestrator";
import { getSoloCourses } from "@/lib/soloCourses";
import { PresetType } from "@/types/travel";
import CourseResults from "@/components/CourseResults";
import PageHeader from "@/components/PageHeader";
import PetPlacesLink from "@/components/PetPlacesLink";

// 일정 탭: 당일치기(기본) / 1박 2일. ?days=2로 전환한다.
const DURATION_TABS = [
  { days: 1, label: "당일치기" },
  { days: 2, label: "1박 2일" },
];

export default async function CoursePresetPage({
  params,
  searchParams,
}: {
  params: Promise<{ preset: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { preset } = await params;
  const presetDef = getPreset(preset);
  if (!presetDef) notFound();

  const { days: rawDays } = await searchParams;
  const durationDays = (Array.isArray(rawDays) ? rawDays[0] : rawDays) === "2" ? 2 : 1;

  const presetType = presetDef.type as PresetType;
  // 혼자 여행은 테마별 코스를 미리 만들어 뒀다(src/lib/data/soloCourses.json) —
  // 생성 대기 없이 바로 띄우고, "더 보기"는 파이프라인이 이어서 만든다.
  const curated = presetType === "solo" ? getSoloCourses(durationDays) : [];
  // 외국어에서 이 유형을 열지 않는 판단은 layout.tsx가 한다 (상태 코드 때문).
  const initialCourses =
    curated.length > 0 ? curated : await generateCourses({ presetType, count: 3, durationDays });

  return (
    <div className="page-width pb-6 pt-6">
      <PageHeader
        className="mb-4 px-4"
        backHref="/"
        backLabel="다른 유형 보기"
        title={`${presetDef.emoji} ${presetDef.label}`}
        description={presetDef.description}
        expression="happy"
      >
        {presetType === "pet" && (
          <div className="mt-3">
            <PetPlacesLink />
          </div>
        )}
        {/* 본문이 넓어지는 데스크톱에서 탭 두 개가 화면 끝까지 늘어나지 않게 가둔다. */}
        <div role="tablist" className="mt-4 flex max-w-md gap-2">
          {DURATION_TABS.map((tab) => {
            const active = tab.days === durationDays;
            return (
              <LocaleLink
                key={tab.days}
                role="tab"
                aria-selected={active}
                href={tab.days === 1 ? `/course/${preset}` : `/course/${preset}?days=${tab.days}`}
                replace
                className={`flex min-h-11 flex-1 items-center justify-center rounded-[var(--radius-button)] border text-sm font-semibold ${
                  active
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                    : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-muted)]"
                }`}
              >
                {tab.label}
              </LocaleLink>
            );
          })}
        </div>
      </PageHeader>
      <CourseResults
        key={durationDays}
        presetType={presetType}
        initialCourses={initialCourses}
        durationDays={durationDays}
      />
    </div>
  );
}
