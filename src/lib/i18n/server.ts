import { lang } from "next/root-params";
import { DEFAULT_LOCALE, isLocale, type Locale } from "./config";
import { getDictionary, type Dictionary } from "./dictionaries";

// 서버 컴포넌트에서 지금 언어와 사전을 꺼내는 길.
//
// next/root-params의 lang()은 주소의 [lang] 조각을 돌려준다 — 서버 컴포넌트 전용이라
// 클라이언트에서는 쓸 수 없다(그쪽은 useI18n()). 모르는 값이 들어오면 기본 언어로
// 떨어진다: 레이아웃이 이미 isLocale로 걸러 404를 내므로 여기까지 오면 비정상인데,
// 그때 화면이 비는 것보다 한국어가 나오는 편이 낫다.

export async function currentLocale(): Promise<Locale> {
  const segment = await lang();
  return segment && isLocale(segment) ? segment : DEFAULT_LOCALE;
}

export async function serverDictionary(): Promise<Dictionary> {
  return getDictionary(await currentLocale());
}
