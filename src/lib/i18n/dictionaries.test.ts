import assert from "node:assert/strict";
import { test } from "node:test";
import { LOCALES, DEFAULT_LOCALE, isLocale, canGenerateCourses, type Locale } from "./config";
import { getDictionary } from "./dictionaries";
import { langFromPath, stripLang, withLang } from "./href";

// 사전의 키가 언어마다 같은지 본다. 타입만으로는 부족하다 — 값이 빈 문자열이거나
// 번역을 깜빡한 자리는 타입에 걸리지 않는데, 그러면 외국어 화면에 빈칸이 나간다.
function flatten(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    flatten(child, prefix ? `${prefix}.${key}` : key),
  );
}

test("사전의 키가 모든 언어에서 같다", () => {
  const base = flatten(getDictionary(DEFAULT_LOCALE)).sort();
  for (const locale of LOCALES) {
    assert.deepEqual(flatten(getDictionary(locale)).sort(), base, `${locale} 사전의 키가 다르다`);
  }
});

test("빈 문구가 없다", () => {
  for (const locale of LOCALES) {
    const walk = (value: unknown, path: string) => {
      if (typeof value === "string") {
        assert.ok(value.trim().length > 0, `${locale}의 ${path}가 비어 있다`);
        return;
      }
      for (const [key, child] of Object.entries(value as object)) walk(child, `${path}.${key}`);
    };
    walk(getDictionary(locale), locale);
  }
});

test("{자리} 틀이 번역에서 사라지지 않았다", () => {
  // fill()이 끼워 넣을 자리다. 번역하다 하나 빠지면 타입에도 테스트 키 비교에도
  // 걸리지 않고, 화면에 "코스 개"처럼 숫자만 빠진 문장이 나간다.
  const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
  const base = getDictionary(DEFAULT_LOCALE);

  for (const locale of LOCALES) {
    if (locale === DEFAULT_LOCALE) continue;
    const walk = (ko: unknown, other: unknown, path: string) => {
      if (typeof ko === "string") {
        assert.deepEqual(
          placeholders(other as string),
          placeholders(ko),
          `${locale}의 ${path}에서 {자리}가 어긋난다`,
        );
        return;
      }
      for (const [key, child] of Object.entries(ko as object)) {
        walk(child, (other as Record<string, unknown>)[key], `${path}.${key}`);
      }
    };
    walk(base, getDictionary(locale), locale);
  }
});

test("언어 이름은 어느 사전에서나 같다", () => {
  // lang.ko는 어느 화면에서든 "한국어"여야 목록이 읽힌다 — 자기 언어로 적는 자리라
  // 번역하면 안 된다(scripts/build-dictionary.ts의 COPY_VERBATIM).
  // label("언어")은 그 화면의 언어로 번역되는 자리라 빼고 본다.
  const names = (locale: Locale) =>
    Object.fromEntries(Object.entries(getDictionary(locale).lang).filter(([key]) => key !== "label"));
  const base = names(DEFAULT_LOCALE);

  for (const locale of LOCALES) {
    assert.ok(getDictionary(locale).lang.label.trim().length > 0, `${locale}의 lang.label이 비어 있다`);
    assert.deepEqual(names(locale), base, `${locale}의 언어 이름이 다르다`);
  }
});

test("모르는 언어는 기본 사전으로 떨어진다", () => {
  // 화면이 비는 것보다 한국어가 나오는 게 낫다.
  assert.equal(getDictionary("zz" as never), getDictionary(DEFAULT_LOCALE));
});

test("isLocale은 지원하는 언어만 통과시킨다", () => {
  for (const locale of LOCALES) assert.ok(isLocale(locale));
  // 경로 조각이 언어로 오인되면 /course가 언어판이 되어 버린다.
  assert.ok(!isLocale("course"));
  assert.ok(!isLocale("zz"));
});

test("실시간 생성은 한국어에서만 열린다", () => {
  assert.ok(canGenerateCourses(DEFAULT_LOCALE));
  for (const locale of LOCALES) {
    if (locale !== DEFAULT_LOCALE) assert.ok(!canGenerateCourses(locale), `${locale}에서 열려 있다`);
  }
});

test("withLang이 주소에 언어를 붙인다", () => {
  assert.equal(withLang("en", "/"), "/en");
  assert.equal(withLang("en", "/map"), "/en/map");
  assert.equal(withLang("ko", "/course/mbti/ESTJ"), "/ko/course/mbti/ESTJ");
});

test("withLang은 이미 붙은 언어를 두 번 붙이지 않는다", () => {
  // LocaleLink 안쪽에서 또 한 번 불릴 수 있다 — "/en/en/map"이 되면 404다.
  assert.equal(withLang("en", "/en/map"), "/en/map");
  assert.equal(withLang("en", "/ko/map"), "/ko/map");
});

test("withLang은 바깥으로 나가는 주소를 건드리지 않는다", () => {
  assert.equal(withLang("en", "https://welflows.com"), "https://welflows.com");
  assert.equal(withLang("en", "nmap://route/car"), "nmap://route/car");
});

test("stripLang이 언어를 떼어 낸다", () => {
  assert.equal(stripLang("/en/map"), "/map");
  assert.equal(stripLang("/en"), "/");
  assert.equal(stripLang("/"), "/");
  // 언어가 아닌 첫 조각은 그대로 둔다 — "/map"을 "/"로 만들면 안 된다.
  assert.equal(stripLang("/map"), "/map");
  assert.equal(stripLang("/course/mbti/ESTJ"), "/course/mbti/ESTJ");
});

test("langFromPath가 주소에서 언어를 읽는다", () => {
  assert.equal(langFromPath("/en/favorites"), "en");
  assert.equal(langFromPath("/ko"), "ko");
  assert.equal(langFromPath("/favorites"), DEFAULT_LOCALE);
  assert.equal(langFromPath("/"), DEFAULT_LOCALE);
});
