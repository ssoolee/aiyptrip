import { lang } from "next/root-params";
import LocaleLink from "./LocaleLink";
import { canGenerateCourses, DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";
import { CURATED_PRESETS, PRESETS } from "@/lib/presets";

// 코스 유형 카드 줄. 섹션 제목은 홈에서 SectionHead가 붙여 준다.
// 카드 줄만 화면 끝까지 흐르게 둬서 모바일에서 가로로 쓸어 넘길 수 있다.
export default async function PresetGrid() {
  const segment = await lang();
  const locale = segment && isLocale(segment) ? segment : DEFAULT_LOCALE;
  // 큐레이션이 없는 유형은 눌러도 실시간 생성이라 외국어에서는 404가 된다 —
  // 막힌 문을 보여주지 않는다 (course/[preset]/page.tsx와 같은 기준).
  const presets = canGenerateCourses(locale)
    ? PRESETS
    : PRESETS.filter((p) => CURATED_PRESETS.includes(p.type));

  return (
    <div className="flex gap-3 overflow-x-auto px-4 pb-3 pt-1 sm:grid sm:grid-cols-3 sm:overflow-visible">
      {presets.map((preset) => (
        <LocaleLink
          key={preset.type}
          href={`/course/${preset.type}`}
          className="surface-card lift flex min-w-[140px] shrink-0 flex-col items-center gap-2 p-4 text-center hover:border-[var(--color-primary)] sm:min-w-0"
        >
          <span className="text-3xl" aria-hidden>
            {preset.emoji}
          </span>
          <span className="display text-[15px]">{preset.label}</span>
          <span className="text-xs leading-relaxed text-[var(--color-subtle)]">
            {preset.description}
          </span>
        </LocaleLink>
      ))}
    </div>
  );
}
