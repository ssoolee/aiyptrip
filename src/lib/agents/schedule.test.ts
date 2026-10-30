import { strict as assert } from "node:assert";
import { test } from "node:test";
import { DWELL_MINUTES, SEOUL_ORIGIN, driveMinutes, formatClock, scheduleItinerary } from "./schedule";
import { Category, ItineraryDay } from "@/types/travel";

// 양평 안의 실제 좌표 몇 개 (src/lib/data/places.json에서 가져옴).
const YANGPYEONG_STATION = { lat: 37.4925, lng: 127.4936 };
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

function minutesOf(timeSlot: string): number {
  const [hour, minute] = timeSlot.split("-")[0].split(":").map(Number);
  return hour * 60 + minute;
}

test("서울에서 양평까지는 한 시간 안팎으로 잡는다", () => {
  const minutes = driveMinutes(SEOUL_ORIGIN, YANGPYEONG_STATION);
  assert.ok(minutes >= 50 && minutes <= 85, `서울→양평역 ${minutes}분`);
});

test("양평 안의 이동은 멀어도 한 시간을 넘지 않는다", () => {
  const minutes = driveMinutes(DUMULMERI, YONGMUNSA);
  assert.ok(minutes >= 10 && minutes <= 60, `두물머리→용문사 ${minutes}분`);
});

test("가까운 두 지점도 최소 5분은 잡는다", () => {
  assert.equal(driveMinutes(YANGPYEONG_STATION, YANGPYEONG_STATION), 5);
});

test("formatClock은 24시간 시계로 적는다", () => {
  assert.equal(formatClock(9 * 60), "09:00");
  assert.equal(formatClock(13 * 60 + 5), "13:05");
  assert.equal(formatClock(25 * 60), "01:00");
});

test("당일치기 첫 스팟은 서울에서 출발해 이동한 뒤에 시작한다", () => {
  const days: ItineraryDay[] = [
    {
      day: 1,
      stops: [
        stop("두물머리", "attraction", DUMULMERI),
        stop("점심집", "restaurant", YANGPYEONG_STATION),
        stop("용문사", "attraction", YONGMUNSA),
      ],
    },
  ];

  const [scheduled] = scheduleItinerary(days);
  const leg = driveMinutes(SEOUL_ORIGIN, DUMULMERI);

  assert.equal(scheduled.departure?.place, "서울(시청 기준)");
  assert.equal(scheduled.departure?.at, "09:00");
  assert.equal(scheduled.departure?.minutes, leg);
  assert.equal(minutesOf(scheduled.stops[0].timeSlot), 9 * 60 + leg);
  assert.equal(scheduled.stops[0].travelMinutes, leg);
});

test("각 스팟은 앞 스팟의 체류시간과 이동시간만큼 뒤로 밀린다", () => {
  const days: ItineraryDay[] = [
    {
      day: 1,
      stops: [stop("두물머리", "attraction", DUMULMERI), stop("카페", "cafe", YANGPYEONG_STATION)],
    },
  ];

  const [scheduled] = scheduleItinerary(days);
  const firstStart = minutesOf(scheduled.stops[0].timeSlot);
  const secondStart = minutesOf(scheduled.stops[1].timeSlot);

  assert.equal(
    secondStart,
    firstStart + DWELL_MINUTES.attraction + driveMinutes(DUMULMERI, YANGPYEONG_STATION),
  );
});

test("점심은 11:40, 저녁은 17:00 전에 잡지 않는다", () => {
  // 서울에서 바로 식당으로 가면 10시 조금 넘어 닿는다 — 그래도 점심은 11:40부터.
  const days: ItineraryDay[] = [
    {
      day: 1,
      stops: [
        stop("점심집", "restaurant", DUMULMERI),
        stop("저녁집", "restaurant", YANGPYEONG_STATION),
      ],
    },
  ];

  const [scheduled] = scheduleItinerary(days);
  assert.equal(scheduled.stops[0].timeSlot.split("-")[0], "11:40");
  assert.equal(scheduled.stops[1].timeSlot.split("-")[0], "17:00");
});

test("첫 스팟이 점심이면 기다리지 않도록 그만큼 늦게 나선다", () => {
  const days: ItineraryDay[] = [{ day: 1, stops: [stop("점심집", "restaurant", DUMULMERI)] }];

  const [scheduled] = scheduleItinerary(days);
  const leg = driveMinutes(SEOUL_ORIGIN, DUMULMERI);

  assert.equal(scheduled.stops[0].timeSlot.split("-")[0], "11:40");
  assert.equal(scheduled.departure?.at, formatClock(11 * 60 + 40 - leg));
});

test("마지막 날에는 서울로 돌아오는 시각이 붙는다", () => {
  const days: ItineraryDay[] = [
    { day: 1, stops: [stop("용문사", "attraction", YONGMUNSA)] },
  ];

  const [scheduled] = scheduleItinerary(days);
  const end = minutesOf(scheduled.stops[0].timeSlot) + DWELL_MINUTES.attraction;
  const home = driveMinutes(YONGMUNSA, SEOUL_ORIGIN);

  assert.equal(scheduled.arrival?.place, "서울(시청 기준)");
  assert.equal(scheduled.arrival?.at, formatClock(end + home));
  assert.equal(scheduled.arrival?.minutes, home);
});

test("숙소에서 하루를 마치면 복귀 안내가 없고, 다음 날은 그 숙소에서 출발한다", () => {
  const days: ItineraryDay[] = [
    {
      day: 1,
      stops: [stop("두물머리", "attraction", DUMULMERI), stop("펜션", "lodging", YONGMUNSA)],
    },
    { day: 2, stops: [stop("아침카페", "cafe", YANGPYEONG_STATION)] },
  ];

  const [first, second] = scheduleItinerary(days);

  assert.equal(first.arrival, undefined);
  assert.equal(second.departure?.place, "펜션");
  assert.equal(second.departure?.at, "10:00");
  assert.equal(
    minutesOf(second.stops[0].timeSlot),
    10 * 60 + driveMinutes(YONGMUNSA, YANGPYEONG_STATION),
  );
  assert.ok(second.arrival, "마지막 날에는 복귀 안내가 있다");
});

test("당일치기 다섯 곳을 돌아도 밤 아홉 시 전에는 서울에 닿는다", () => {
  const days: ItineraryDay[] = [
    {
      day: 1,
      stops: [
        stop("두물머리", "attraction", DUMULMERI),
        stop("점심집", "restaurant", DUMULMERI),
        stop("용문사", "attraction", YONGMUNSA),
        stop("카페", "cafe", YONGMUNSA),
        stop("저녁집", "restaurant", YANGPYEONG_STATION),
      ],
    },
  ];

  const [scheduled] = scheduleItinerary(days);
  const [hour, minute] = (scheduled.arrival?.at ?? "").split(":").map(Number);
  assert.ok(hour * 60 + minute < 21 * 60, `서울 도착 ${scheduled.arrival?.at}`);
});
