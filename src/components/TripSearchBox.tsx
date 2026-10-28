import Link from "next/link";
import { MAX_QUERY_LENGTH } from "@/lib/agents/requestInterpreter";

const EXAMPLES = ["비 오는 날 아이랑 갈 만한 곳", "연인과 조용한 뷰 카페 당일치기", "강아지랑 1박 2일"];

// 자연어로 원하는 여행을 적는 입력창. 일반 GET 폼이라 JS 없이도 동작한다.
export default function TripSearchBox({ defaultValue, showExamples }: { defaultValue?: string; showExamples?: boolean }) {
  return (
    <div className="px-4">
      <form action="/course/search" className="flex gap-2">
        <input
          name="q"
          defaultValue={defaultValue}
          required
          maxLength={MAX_QUERY_LENGTH}
          placeholder="예: 비 오는 날 아이랑 갈 만한 곳"
          aria-label="원하는 여행 설명"
          className="min-w-0 flex-1 rounded-[var(--radius-button)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2.5 text-sm"
        />
        <button
          type="submit"
          className="shrink-0 rounded-[var(--radius-button)] bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white"
        >
          코스 찾기
        </button>
      </form>
      {showExamples && (
        <div className="mt-2 flex flex-wrap gap-2">
          {EXAMPLES.map((example) => (
            <Link
              key={example}
              href={`/course/search?q=${encodeURIComponent(example)}`}
              className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-muted)] hover:border-[var(--color-primary)]"
            >
              {example}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
