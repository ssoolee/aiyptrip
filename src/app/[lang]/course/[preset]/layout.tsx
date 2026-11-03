import { notFound } from "next/navigation";
import { lang } from "next/root-params";
import { canGenerateCourses, DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";
import { CURATED_PRESETS } from "@/lib/presets";

// 미리 만들어 둔 코스가 없는 유형(지금은 "반려동물과 함께")은 눌렀을 때 실시간으로
// 생성하는데, 생성 글은 한국어로만 나온다. 그래서 외국어에서는 열지 않는다 —
// 홈의 유형 카드(PresetGrid)도 같은 기준으로 그 카드를 숨긴다.
//
// 페이지가 아니라 이 레이아웃에서 막는 이유는 상태 코드다 — 같은 폴더의 loading.tsx가
// Suspense 경계를 만들어, 페이지 안에서 notFound()를 부르면 껍데기가 이미 200으로
//나간 뒤라 내용만 404이고 코드는 200인 "가짜 404"가 된다.
export default async function CoursePresetLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ preset: string }>;
}) {
  const [{ preset }, segment] = await Promise.all([params, lang()]);
  const locale = segment && isLocale(segment) ? segment : DEFAULT_LOCALE;
  if (!canGenerateCourses(locale) && !CURATED_PRESETS.includes(preset)) notFound();
  return children;
}
