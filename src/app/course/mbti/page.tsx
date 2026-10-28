import Link from "next/link";
import { MBTI_GROUPS } from "@/lib/mbti";
import PageHeader from "@/components/PageHeader";

// 홈의 "MBTI 성향별" 프리셋이 여는 16유형 선택 화면. 정적 세그먼트라
// /course/[preset]보다 먼저 매칭된다.
export default function MbtiSelectPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 pb-6 pt-6">
      <PageHeader
        className="mb-6"
        backHref="/"
        backLabel="다른 유형 보기"
        title="🔤 MBTI 성향별 여행"
        description="내 MBTI를 고르면 성향에 맞춘 양평 코스를 추천해드려요."
        expression="wink"
      />

      <div className="space-y-5">
        {MBTI_GROUPS.map((group) => (
          <section key={group.label}>
            <h2 className="mb-2 text-sm font-semibold text-[var(--color-muted)]">{group.label}</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {group.types.map((type) => (
                <Link
                  key={type}
                  href={`/course/mbti/${type}`}
                  className="flex min-h-14 items-center justify-center rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] text-base font-bold tracking-wide transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                >
                  {type}
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
