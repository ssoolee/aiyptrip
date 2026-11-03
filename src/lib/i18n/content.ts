import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import type { Course, ItineraryTransfer, LodgingPick, Place, TopPlace } from "@/types/travel";
import roman from "@/lib/data/i18n/places.roman.json";
import en from "@/lib/data/i18n/content.en.json";
import ja from "@/lib/data/i18n/content.ja.json";
import zh from "@/lib/data/i18n/content.zh.json";

// 커밋된 장소·코스 자료를 화면에 올릴 때 언어를 입힌다. 번역은 scripts/build-i18n.ts가
// 미리 만들어 둔 사이드카에서 온다(src/lib/data/i18n/content.<locale>.json).
//
// **읽는 자리를 여기 한 곳으로 모은다.** 자료를 쓰는 곳이 여섯 군데(지도·반려동물·홈의
// 인기 장소·MBTI·혼자 여행·코스 상세)라, 화면마다 번역을 찾으면 한 군데를 빼먹었을 때
// 그 화면만 한국어로 남는다.
//
// 번역이 없는 항목은 **한국어로 떨어진다** — 빈 화면보다 낫고, 한 장소를 못 찾았다고
// 코스 전체가 사라지지 않는다.
//
// 이 모듈은 서버에서만 쓰인다(지금 자료를 읽는 모듈 네 개가 모두 서버 전용이다).
// 클라이언트 컴포넌트에서 import하면 사이드카가 브라우저 번들로 따라간다 — 찜 목록을
// 번역해야 할 때는 서버에서 번역한 뒤 내려보내는 쪽을 먼저 보자.

interface PlaceTranslation {
  categoryLabel?: string;
  reviewSummary?: string;
  reviewTitle?: string;
}

/**
 * 이름과 주소는 **번역이 아니라 로마자 표기**라 언어가 없다. 파일 하나를 모든 언어가
 * 같이 쓴다 — 언어마다 만들면 같은 장소가 영어에서는 "Semiwon", 일본어에서는
 * "Semione"이 된다(실제로 그랬다).
 */
const ROMAN = roman.places as Record<string, { name?: string; address?: string } | undefined>;

interface Sidecar {
  places: Record<string, PlaceTranslation | undefined>;
  /** 한국어 원문 → 번역. 원문이 키라 사람이 읽고 고칠 수 있다. */
  texts: Record<string, string | undefined>;
}

// 한국어는 사이드카가 없다 — 원본이 한국어다.
const SIDECARS: Partial<Record<Locale, Sidecar>> = {
  en: en as unknown as Sidecar,
  ja: ja as unknown as Sidecar,
  zh: zh as unknown as Sidecar,
};

/** 번역된 문장. 없으면 한국어 원문 그대로. */
export function localizeText(ko: string, locale: Locale): string {
  if (locale === DEFAULT_LOCALE) return ko;
  return SIDECARS[locale]?.texts[ko] ?? ko;
}

function localizeMaybe(ko: string | undefined, locale: Locale): string | undefined {
  return ko === undefined ? undefined : localizeText(ko, locale);
}

/**
 * 장소 이름은 **`로마자 이름 (한글)`** 로 쓴다. 외국인 여행자가 택시 기사나 가게에
 * 보여줄 수 있어야 하고, 네이버 지도·전화 버튼이 가리키는 대상과 눈으로 맞출 수 있어야
 * 한다 — 한쪽만 남기면 둘 다 못 한다.
 *
 * 이름과 주소는 **일본어·중국어에서도 로마자**다(scripts/build-i18n.ts). 한국의 도로
 * 표지와 지도 앱이 쓰는 표기라 읽어서 말하거나 그대로 입력할 수 있다. 한자로 옮기면
 * 현지에서 가리키는 것이 없어진다 — '세미원'을 '洗美苑'으로 적어 봐야 통하지 않는다.
 */
function displayName(translated: string, korean: string): string {
  return translated === korean ? korean : `${translated} (${korean})`;
}

/**
 * **딱 한 번만 적용한다 — 통로는 src/lib/curation.ts의 withFreshFacts다.**
 * 두 번 돌리면 이름이 "En (En (한글))"로 겹친다. 그래서 TopPlace·LodgingPick의
 * 나머지 필드는 아래 함수들이 따로 맡고, 여기서 또 부르지 않는다.
 */
export function localizePlace<T extends Place>(place: T, locale: Locale): T {
  if (locale === DEFAULT_LOCALE) return place;
  const t = SIDECARS[locale]?.places[place.placeId];
  const r = ROMAN[place.placeId];
  if (!t && !r) return place;

  const next: T = { ...place };
  if (r?.name) next.name = displayName(r.name, place.name);
  if (r?.address) next.address = r.address;
  if (t?.categoryLabel) next.categoryLabel = t.categoryLabel;
  if (t?.reviewSummary) next.reviewSummary = t.reviewSummary;
  // 영업시간 원문(businessHoursRaw)은 번역하지 않는다 — src/lib/businessHours.ts가
  // 한국어 정규식으로 해석하는 입력이다. 화면에 보이는 해석 결과는 사전(hours.*)에서 온다.
  return next;
}

/** 인기 장소의 대표 블로그 글 제목. withFreshFacts를 거친 장소에 더해 쓴다. */
export function localizeReviewTitle(place: TopPlace, locale: Locale): TopPlace {
  if (locale === DEFAULT_LOCALE) return place;
  const title = SIDECARS[locale]?.places[place.placeId]?.reviewTitle;
  return title ? { ...place, reviewTitle: title } : place;
}

/** 숙소 추천에만 있는 글. withFreshFacts를 거친 장소에 더해 쓴다. */
export function localizeLodgingText(pick: LodgingPick, locale: Locale): LodgingPick {
  if (locale === DEFAULT_LOCALE) return pick;
  return {
    ...pick,
    lodgingType: localizeText(pick.lodgingType, locale),
    reason: localizeMaybe(pick.reason, locale),
    notice: localizeMaybe(pick.notice, locale),
  };
}

function localizeTransfer(transfer: ItineraryTransfer, locale: Locale): ItineraryTransfer {
  return { ...transfer, place: localizeText(transfer.place, locale) };
}

/**
 * 코스의 글만 번역한다 — 장소는 localizePlace가, 시각·거리는 curation.ts가 맡는다.
 * course.notice는 건드리지 않는다: 저장된 값이 아니라 withHoursNotice가 사전 틀로
 * 그때 만든 문장이다.
 */
export function localizeCourse(course: Course, locale: Locale): Course {
  if (locale === DEFAULT_LOCALE) return course;
  return {
    ...course,
    title: localizeText(course.title, locale),
    reason: localizeMaybe(course.reason, locale),
    days: course.days.map((day) => ({
      ...day,
      departure: day.departure && localizeTransfer(day.departure, locale),
      arrival: day.arrival && localizeTransfer(day.arrival, locale),
      stops: day.stops.map((stop) => ({
        ...stop,
        reason: localizeMaybe(stop.reason, locale),
      })),
    })),
  };
}
