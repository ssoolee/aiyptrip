"use client";

import { createContext, useContext, useMemo } from "react";
import type { Locale } from "./config";
import type { Dictionary } from "./dictionaries";
import { withLang } from "./href";

// 사전을 클라이언트 컴포넌트에 전달하는 통로.
//
// next/root-params의 lang()은 **서버 컴포넌트에서만** 된다. 그런데 글자가 많은 화면이
// 거의 다 클라이언트 컴포넌트라(CourseDetailScreen·PlaceDetailSheet·CourseCard 등 26개)
// 서버에서 고른 사전을 Provider로 한 번 넘기고 훅으로 받는다.

interface I18nValue {
  lang: Locale;
  t: Dictionary;
  /** 앱 내부 주소에 언어를 붙인다. href("/map") → "/en/map" */
  href: (path: string) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  lang,
  dict,
  children,
}: {
  lang: Locale;
  dict: Dictionary;
  children: React.ReactNode;
}) {
  const value = useMemo<I18nValue>(
    () => ({ lang, t: dict, href: (path: string) => withLang(lang, path) }),
    [lang, dict],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  // Provider 밖에서 부르면 바로 알아채는 게 낫다 — 조용히 한국어로 떨어지면
  // 외국어 화면에 한국어가 섞여 나가고 아무도 모른다.
  if (!value) throw new Error("useI18n은 I18nProvider 안에서만 쓸 수 있다");
  return value;
}
