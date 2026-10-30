import { strict as assert } from "node:assert";
import { test } from "node:test";
import { REASON_MAX_LENGTH, courseFacts, fallbackReason } from "./courseReason";
import { scheduleItinerary } from "./schedule";
import { Category, ItineraryDay } from "@/types/travel";

const DUMULMERI = { lat: 37.5272, lng: 127.3245 };
const YONGMUNSA = { lat: 37.5542, lng: 127.5558 };

function stop(name: string, category: Category, at: { lat: number; lng: number }) {
  return {
    placeId: name,
    name,
    category,
    lat: at.lat,
    lng: at.lng,
    address: "경기도 양평군",
    photos: [],
    mapUrl: "",
    tags: [],
    timeSlot: "",
  };
}

const dayTrip: ItineraryDay[] = scheduleItinerary([
  {
    day: 1,
    stops: [
      stop("두물머리", "attraction", DUMULMERI),
      stop("점심집", "restaurant", DUMULMERI),
      stop("용문사", "attraction", YONGMUNSA),
      stop("카페", "cafe", YONGMUNSA),
      stop("저녁집", "restaurant", DUMULMERI),
    ],
  },
]);

const overnight: ItineraryDay[] = scheduleItinerary([
  { day: 1, stops: [stop("두물머리", "attraction", DUMULMERI), stop("펜션", "lodging", YONGMUNSA)] },
  { day: 2, stops: [stop("아침카페", "cafe", DUMULMERI)] },
]);

test("추천 이유는 200자 안팎이다", () => {
  for (const [label, days] of [["당일치기", dayTrip], ["1박 2일", overnight]] as const) {
    const reason = fallbackReason(days);
    assert.ok(reason.length >= 120, `${label} ${reason.length}자 — 너무 짧다`);
    assert.ok(reason.length <= REASON_MAX_LENGTH, `${label} ${reason.length}자 — 너무 길다`);
  }
});

test("코스에서 읽히는 사실만 쓴다 — 출발·복귀 시각이 그대로 들어간다", () => {
  const reason = fallbackReason(dayTrip);
  assert.ok(reason.includes(dayTrip[0].departure!.at), "서울 출발 시각");
  assert.ok(reason.includes(dayTrip[0].arrival!.at), "서울 복귀 시각");
  assert.ok(reason.includes("두물머리"), "첫 스팟 이름");
});

test("숙소가 있으면 숙소와 체크아웃을 말하고, 없으면 말하지 않는다", () => {
  assert.ok(fallbackReason(overnight).includes("펜션에서 묵고"));
  assert.ok(!fallbackReason(dayTrip).includes("묵고"));
});

test("받침에 맞는 조사를 고른다", () => {
  const reason = fallbackReason(dayTrip);
  // "…카페 한 곳을" — 받침이 있는 "곳"에는 "을"이 붙어야 한다.
  assert.ok(/곳을|곳를/.test(reason));
  assert.ok(!reason.includes("곳를"), "받침 있는 말에 '를'을 붙이면 안 된다");
});

test("테마 한 줄을 주면 그 말로 코스의 성격을 설명한다", () => {
  const reason = fallbackReason(dayTrip, "숲길과 휴양림을 먼저 골라 천천히 걷는 코스");
  assert.ok(reason.includes("숲길과 휴양림"));
});

test("코스가 다르면 설명도 다르다 — 카드 여섯 장이 같은 문장이 되지 않게", () => {
  const other = scheduleItinerary([
    { day: 1, stops: [stop("용문사", "attraction", YONGMUNSA), stop("점심집", "restaurant", DUMULMERI)] },
  ]);
  assert.notEqual(fallbackReason(dayTrip), fallbackReason(other));
  // 같은 코스는 늘 같은 설명이어야 한다(빌드 결과가 흔들리지 않도록).
  assert.equal(fallbackReason(dayTrip), fallbackReason(dayTrip));
});

test("이동·체류 시간 합계를 센다", () => {
  const facts = courseFacts(dayTrip);
  assert.equal(facts.counts.attraction, 2);
  assert.equal(facts.counts.restaurant, 2);
  assert.equal(facts.counts.cafe, 1);
  // 관광지 90 × 2 + 식당 70 × 2 + 카페 60
  assert.equal(facts.stayMinutes, 380);
  assert.ok(facts.travelMinutes > 0);
});
