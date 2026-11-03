// 다국어 설정의 한 곳. 언어를 늘릴 때 여기부터 고친다.
//
// 주소에 언어가 들어간다(/ko, /en). 쿠키를 쓰지 않는 이유는 Firebase Hosting이
// __session 말고 모든 쿠키를 벗기기 때문이다(README "Hosting 제약") — next-intl 같은
// 라이브러리가 흔히 쓰는 NEXT_LOCALE 쿠키 방식은 이 앱에서 아예 작동하지 않는다.

export const LOCALES = ["ko", "en"] as const;

export type Locale = (typeof LOCALES)[number];

/** 주소에 언어가 없을 때 보낼 곳. 구 주소 301은 firebase.json의 redirects가 맡는다. */
export const DEFAULT_LOCALE: Locale = "ko";

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/**
 * 실시간 AI 생성을 쓰는 화면을 열어 줄 언어.
 *
 * 코스 생성은 프롬프트·글자 수 제한("25자 이내 한국어")·조사 처리가 모두 한국어에
 * 묶여 있어(src/lib/agents/enrichment.ts, requestInterpreter.ts) 외국어로는 한국어 글이
 * 그대로 나간다. 그래서 그 입구만 내려 둔다 — featureFlags.ts의 LOGIN_ENABLED와 같은
 * 방식이고, 코드는 지우지 않는다.
 *
 * 해당하는 화면: /course/search, /course/pet, 홈의 검색창, 목록의 "더 보기".
 * /course/solo·/course/mbti는 커밋된 큐레이션이라 번역되므로 모든 언어에서 열린다.
 */
export const SEARCH_LOCALES: readonly Locale[] = ["ko"];

export function canGenerateCourses(locale: Locale): boolean {
  return SEARCH_LOCALES.includes(locale);
}

/** <html lang>에 넣는 값과 og:locale. */
export const HTML_LANG: Record<Locale, string> = {
  ko: "ko",
  en: "en",
};

export const OG_LOCALE: Record<Locale, string> = {
  ko: "ko_KR",
  en: "en_US",
};
