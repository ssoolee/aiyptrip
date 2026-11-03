import { notFound } from "next/navigation";
import { lang } from "next/root-params";
import { canGenerateCourses, DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";

// 자연어 검색을 한국어에서만 여는 문. 페이지가 아니라 이 레이아웃에서 막는 이유는
// 상태 코드다 — 같은 폴더의 loading.tsx가 Suspense 경계를 만들어, 페이지 안에서
// notFound()를 부르면 껍데기가 이미 200으로 나간 뒤라 내용만 404이고 코드는 200인
// "가짜 404"가 된다. 레이아웃은 그 경계보다 바깥이라 코드를 아직 정할 수 있다.
export default async function CourseSearchLayout({ children }: { children: React.ReactNode }) {
  const segment = await lang();
  const locale = segment && isLocale(segment) ? segment : DEFAULT_LOCALE;
  if (!canGenerateCourses(locale)) notFound();
  return children;
}
