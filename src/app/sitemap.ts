import type { MetadataRoute } from "next";
import { CURATED_PRESETS, PRESETS } from "@/lib/presets";
import { canGenerateCourses, LOCALES, type Locale } from "@/lib/i18n/config";
import { MBTI_TYPES } from "@/lib/mbti";

// /sitemap.xml — 검색엔진에 주소 목록을 건넨다. 다국어를 붙인 이유의 절반이
// 해외 검색 노출이라, 언어판이 서로의 짝임을 alternates로 같이 알린다.
//
// 이 파일은 [lang] **바깥**(src/app/)에 둔다. 크롤러는 /sitemap.xml을 뿌리에서
// 찾지 /ko/sitemap.xml을 찾지 않는다.
//
// 넣지 않는 것:
//   · /favorites — 사람마다 다른 화면이라 수집할 것이 없다
//   · /login·/profile — LOGIN_ENABLED=false라 지금 404다
//   · /course/search — 입력에 따라 매번 다른 결과이고 한국어에서만 열린다
//   · /course/detail/… — 생성 코스는 30일 뒤 사라지고 큐레이션은 목록에서 닿는다

const BASE = "https://aiyptrip.web.app";

/** 그 언어에서 실제로 열리는 경로. 외국어에서는 큐레이션이 있는 유형만 열린다. */
function pathsFor(locale: Locale): string[] {
  const presets = canGenerateCourses(locale)
    ? PRESETS
    : PRESETS.filter((p) => CURATED_PRESETS.includes(p.type));

  return [
    "",
    "/map",
    "/pet-places",
    ...presets.filter((p) => p.type !== "mbti").map((p) => `/course/${p.type}`),
    "/course/mbti",
    ...MBTI_TYPES.map((type) => `/course/mbti/${type}`),
  ];
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return LOCALES.flatMap((locale) =>
    pathsFor(locale).map((path) => ({
      url: `${BASE}/${locale}${path}`,
      lastModified: now,
      // 같은 화면의 다른 언어판. 한 쪽만 걸린 검색어에서도 맞는 언어로 보내 준다.
      alternates: {
        languages: Object.fromEntries(
          LOCALES.filter((other) => pathsFor(other).includes(path)).map((other) => [
            other,
            `${BASE}/${other}${path}`,
          ]),
        ),
      },
    })),
  );
}
