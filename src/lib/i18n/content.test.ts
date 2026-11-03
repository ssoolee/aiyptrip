import assert from "node:assert/strict";
import test from "node:test";
import { withFreshFacts } from "@/lib/curation";
import {
  localizeCourse,
  localizeLodgingText,
  localizePlace,
  localizeReviewTitle,
  localizeText,
} from "@/lib/i18n/content";
import sidecar from "@/lib/data/i18n/content.en.json";
import type { Course, LodgingPick, Place, TopPlace } from "@/types/travel";

// 자료 번역(scripts/build-i18n.ts가 만든 사이드카)을 화면에 입히는 부분.
// 특정 번역문에 기대지 않는다 — 사이드카를 다시 만들거나 사람이 고쳐도 통과해야 한다.

const PLACES = sidecar.places as Record<string, { name?: string; address?: string } | undefined>;
const TEXTS = sidecar.texts as Record<string, string | undefined>;

/** 사이드카에서 이름이 번역된 장소 하나. 특정 장소를 박아 두지 않는다. */
const [sampleId, sampleTranslation] = Object.entries(PLACES).find(([, t]) => t?.name) as [
  string,
  { name: string },
];
const [sampleKo, sampleEn] = Object.entries(TEXTS).find(([, v]) => v) as [string, string];

function place(overrides: Partial<Place> = {}): Place {
  return {
    placeId: sampleId,
    name: "한글이름",
    category: "cafe",
    lat: 37.5,
    lng: 127.5,
    address: "경기도 양평군",
    photos: [],
    mapUrl: "https://map.naver.com/",
    tags: [],
    ...overrides,
  };
}

test("사이드카가 비어 있지 않다", () => {
  assert.ok(Object.keys(PLACES).length > 100, "장소 번역이 들어 있어야 한다");
  assert.ok(Object.keys(TEXTS).length > 100, "문장 번역이 들어 있어야 한다");
});

test("한국어에서는 아무것도 바꾸지 않는다", () => {
  const original = place();
  assert.equal(localizePlace(original, "ko"), original, "같은 객체를 그대로 돌려줘야 한다");
  assert.equal(localizeText(sampleKo, "ko"), sampleKo);
});

test("장소 이름은 'English (한글)'로 나온다", () => {
  const localized = localizePlace(place({ name: "한글이름" }), "en");
  assert.equal(localized.name, `${sampleTranslation.name} (한글이름)`);
});

test("번역이 없는 장소는 한국어로 남는다", () => {
  const unknown = place({ placeId: "없는_아이디", name: "모르는곳" });
  assert.equal(localizePlace(unknown, "en").name, "모르는곳");
});

test("번역이 없는 문장은 한국어로 남는다", () => {
  assert.equal(localizeText("사전에 없는 문장", "en"), "사전에 없는 문장");
});

test("영업시간 원문은 번역하지 않는다", () => {
  // 번역하면 businessHours.ts의 한국어 정규식 파서가 죽는다.
  const raw = "월~금 10:30~20:00 / 휴무: 매주 수요일";
  assert.equal(localizePlace(place({ businessHoursRaw: raw }), "en").businessHoursRaw, raw);
});

test("withFreshFacts를 한 번 거치면 이름이 한 겹만 붙는다", () => {
  // 두 번 적용하면 "En (En (한글))"로 겹친다 — 통로를 withFreshFacts 하나로 두는 이유다.
  const once = withFreshFacts(place({ name: "한글이름" }), "en");
  const matches = once.name.match(/\(/g) ?? [];
  assert.equal(matches.length, 1, `괄호가 한 번만 나와야 한다: ${once.name}`);
});

test("코스는 제목·추천 이유·출발지를 번역하고 notice는 건드리지 않는다", () => {
  const course: Course = {
    courseId: "c1",
    title: sampleKo,
    presetType: "solo",
    notice: "이건 withHoursNotice가 만든다",
    days: [
      {
        day: 1,
        departure: { place: sampleKo, at: "09:00", minutes: 45 },
        stops: [{ ...place(), timeSlot: "12:00-13:30", reason: sampleKo }],
      },
    ],
  };

  const localized = localizeCourse(course, "en");
  assert.equal(localized.title, sampleEn);
  assert.equal(localized.days[0].departure?.place, sampleEn);
  assert.equal(localized.days[0].stops[0].reason, sampleEn);
  // 장소는 localizeCourse가 아니라 withFreshFacts가 맡는다 — 두 번 입히지 않기 위해서다.
  assert.equal(localized.days[0].stops[0].name, "한글이름");
  assert.equal(localized.notice, course.notice);
});

test("숙소·인기 장소의 나머지 글도 번역된다", () => {
  const lodging: LodgingPick = { ...place(), lodgingType: sampleKo, notice: sampleKo };
  const localizedLodging = localizeLodgingText(lodging, "en");
  assert.equal(localizedLodging.lodgingType, sampleEn);
  assert.equal(localizedLodging.notice, sampleEn);
  // 장소 필드는 건드리지 않는다 (withFreshFacts 몫).
  assert.equal(localizedLodging.name, "한글이름");

  const top: TopPlace = { ...place(), blogReviewCount: 10, reviewTitle: "원문 제목" };
  const title = sidecar.places[sampleId as keyof typeof sidecar.places] as
    | { reviewTitle?: string }
    | undefined;
  const localizedTop = localizeReviewTitle({ ...top, placeId: sampleId }, "en");
  assert.equal(localizedTop.reviewTitle, title?.reviewTitle ?? "원문 제목");
});
