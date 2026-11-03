import { DEFAULT_LOCALE, isLocale, type Locale } from "./config";

// 앱 안의 주소에 언어를 붙이고 떼는 유틸.
//
// 이게 필요한 이유: typedRoutes가 꺼져 있어 <Link href="/map">처럼 적어도 타입 오류가
// 나지 않는다. 즉 언어 prefix를 빼먹으면 컴파일은 되고 런타임에 404가 된다. 주소를
// 손으로 적는 대신 이 함수를 쓴다.

/**
 * 앱 내부 주소에 언어를 붙인다. withLang("en", "/map") → "/en/map".
 *
 * 바깥으로 나가는 주소(http로 시작)와 이미 언어가 붙은 주소는 그대로 둔다 — 두 번
 * 붙어 "/en/en/map"이 되는 것을 막는다.
 */
export function withLang(locale: Locale, href: string): string {
  if (!href.startsWith("/")) return href;
  const [first] = href.split("/").filter(Boolean);
  if (first && isLocale(first)) return href;
  return href === "/" ? `/${locale}` : `/${locale}${href}`;
}

/**
 * 주소에서 언어를 떼어 낸다. stripLang("/en/map") → "/map", stripLang("/en") → "/".
 * 언어 전환 버튼이 "지금 보던 화면의 다른 언어"로 보낼 때 쓴다.
 */
export function stripLang(href: string): string {
  const segments = href.split("/").filter(Boolean);
  if (segments.length > 0 && isLocale(segments[0])) segments.shift();
  return segments.length === 0 ? "/" : `/${segments.join("/")}`;
}

/**
 * 주소에 적힌 언어. 없으면 기본값.
 *
 * 클라이언트 컴포넌트에서 usePathname()으로 읽을 때 쓴다 — next/root-params는
 * 서버 컴포넌트에서만 되기 때문이다.
 */
export function langFromPath(pathname: string): Locale {
  const [first] = pathname.split("/").filter(Boolean);
  return first && isLocale(first) ? first : DEFAULT_LOCALE;
}
