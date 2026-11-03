import ko from "./dictionaries/ko.json";
import en from "./dictionaries/en.json";
import { DEFAULT_LOCALE, type Locale } from "./config";

// 화면 문구 사전. 서버에서 한 번 골라 I18nProvider로 넘긴다.
//
// 동적 import(문서의 예시)를 쓰지 않고 그냥 import하는 이유: 사전을 쓰는 화면이 거의
// 다 클라이언트 컴포넌트라(26개) 어차피 payload에 실려 가므로, 서버에서만 쓰이는 값이
// 아니다. 쪼개서 얻는 것이 없고 await만 늘어난다. 사전이 커지면 그때 namespace로 나눈다.
//
// ko를 기준으로 타입을 뽑는다 — en.json에 키가 빠지면 타입 오류가 난다
// (키가 같은지는 src/lib/i18n/dictionaries.test.ts가 한 번 더 본다).
export type Dictionary = typeof ko;

const DICTIONARIES: Record<Locale, Dictionary> = { ko, en };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
}
