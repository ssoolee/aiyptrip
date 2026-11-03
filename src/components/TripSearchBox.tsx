import { lang } from "next/root-params";
import LocaleLink from "./LocaleLink";
import { MAX_QUERY_LENGTH } from "@/lib/agents/requestInterpreter";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";
import { withLang } from "@/lib/i18n/href";

const EXAMPLES = ["비 오는 날 아이랑 갈 만한 곳", "연인과 조용한 뷰 카페 당일치기", "강아지랑 1박 2일"];

// 자연어로 원하는 여행을 적는 입력창. 일반 GET 폼이라 JS 없이도 동작한다.
export default async function TripSearchBox({ defaultValue, showExamples }: { defaultValue?: string; showExamples?: boolean }) {
  const segment = await lang();
  const locale = segment && isLocale(segment) ? segment : DEFAULT_LOCALE;

  return (
    <div className="px-4">
      <form action={withLang(locale, "/course/search")} className="flex gap-2">
        <input
          name="q"
          defaultValue={defaultValue}
          required
          maxLength={MAX_QUERY_LENGTH}
          placeholder="예: 비 오는 날 아이랑 갈 만한 곳"
          aria-label="원하는 여행 설명"
          className="surface-card min-w-0 flex-1 rounded-[var(--radius-button)] px-4 py-3 text-sm outline-none placeholder:text-[var(--color-subtle)] focus:border-[var(--color-primary)]"
        />
        <button
          type="submit"
          className="shrink-0 rounded-[var(--radius-button)] bg-[var(--color-primary)] px-5 py-3 text-sm font-bold text-[var(--color-on-primary)]"
        >
          코스 찾기
        </button>
      </form>
      {showExamples && (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {EXAMPLES.map((example) => (
            <LocaleLink
              key={example}
              href={`/course/search?q=${encodeURIComponent(example)}`}
              className="rounded-[var(--radius-button)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1.5 text-xs text-[var(--color-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              {example}
            </LocaleLink>
          ))}
        </div>
      )}
    </div>
  );
}
