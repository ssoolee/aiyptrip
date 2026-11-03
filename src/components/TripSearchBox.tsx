import LocaleLink from "./LocaleLink";
import { MAX_QUERY_LENGTH } from "@/lib/agents/requestInterpreter";
import { withLang } from "@/lib/i18n/href";
import { currentLocale, serverDictionary } from "@/lib/i18n/server";

// 자연어로 원하는 여행을 적는 입력창. 일반 GET 폼이라 JS 없이도 동작한다.
export default async function TripSearchBox({ defaultValue, showExamples }: { defaultValue?: string; showExamples?: boolean }) {
  const [locale, { search }] = await Promise.all([currentLocale(), serverDictionary()]);

  return (
    <div className="px-4">
      <form action={withLang(locale, "/course/search")} className="flex gap-2">
        <input
          name="q"
          defaultValue={defaultValue}
          required
          maxLength={MAX_QUERY_LENGTH}
          placeholder={search.placeholder}
          aria-label={search.ariaLabel}
          className="surface-card min-w-0 flex-1 rounded-[var(--radius-button)] px-4 py-3 text-sm outline-none placeholder:text-[var(--color-subtle)] focus:border-[var(--color-primary)]"
        />
        <button
          type="submit"
          className="shrink-0 rounded-[var(--radius-button)] bg-[var(--color-primary)] px-5 py-3 text-sm font-bold text-[var(--color-on-primary)]"
        >
          {search.submit}
        </button>
      </form>
      {showExamples && (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {search.examples.map((example) => (
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
