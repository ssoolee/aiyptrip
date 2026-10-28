import { notFound } from "next/navigation";
import Link from "next/link";
import { getPreset } from "@/lib/presets";
import { generateCourses } from "@/lib/agents/orchestrator";
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
  const initialCourses = await generateCourses({ presetType, count: 3, durationDays });

  return (
    <div className="mx-auto max-w-2xl pb-6 pt-6">
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
        <div role="tablist" className="mt-4 flex gap-2">
          {DURATION_TABS.map((tab) => {
            const active = tab.days === durationDays;
            return (
              <Link
                key={tab.days}
                role="tab"
                aria-selected={active}
                href={tab.days === 1 ? `/course/${preset}` : `/course/${preset}?days=${tab.days}`}
                replace
                className={`flex min-h-11 flex-1 items-center justify-center rounded-[var(--radius-button)] border text-sm font-semibold ${
                  active
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                    : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-muted)]"
                }`}
              >
                {tab.label}
              </Link>
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
