import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  DWELL_MINUTES,
  SEOUL_ORIGIN,
  courseLegPairs,
  driveMinutes,
  formatClock,
  scheduleItinerary,
  type RouteLeg,
  type RouteLegLookup,
} from "./schedule";
import type { LatLng } from "@/lib/geo";
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

// ── 실측 구간 조회표(RouteLegLookup) ──────────────────────────────────────────
// 조회표를 주지 않는 위 테스트들이 그대로 통과하는 것 자체가 요구사항이다 —
// 실측이 없으면 지금까지와 똑같이 직선거리 어림값으로 돈다.

/** 좌표쌍을 키로 삼는 간단한 조회표. 실제 조회는 src/lib/routeLegs.ts가 한다. */
function lookupOf(entries: [LatLng, LatLng, RouteLeg][]): RouteLegLookup {
  const key = (a: LatLng, b: LatLng) => `${a.lat},${a.lng}|${b.lat},${b.lng}`;
  const table = new Map(entries.map(([from, to, leg]) => [key(from, to), leg]));
  return (from, to) => table.get(key(from, to));
}

const DAY_TRIP: ItineraryDay[] = [
  {
    day: 1,
    stops: [
      stop("두물머리", "attraction", DUMULMERI),
      stop("점심집", "restaurant", YANGPYEONG_STATION),
    ],
  },
];

test("조회표에 있는 구간은 실측 주행시간·거리·경로를 쓴다", () => {
  const legs = lookupOf([
    [SEOUL_ORIGIN, DUMULMERI, { meters: 54_000, minutes: 70 }],
    [DUMULMERI, YANGPYEONG_STATION, { meters: 18_000, minutes: 25, path: [[127.32, 37.52], [127.49, 37.49]] }],
  ]);

  const [scheduled] = scheduleItinerary(DAY_TRIP, legs);

  assert.equal(scheduled.stops[0].travelMinutes, 70);
  assert.equal(scheduled.stops[0].travelMeters, 54_000);
  assert.equal(scheduled.stops[1].travelMinutes, 25);
  assert.equal(scheduled.stops[1].travelMeters, 18_000);
  assert.deepEqual(scheduled.stops[1].routeFromPrev, [[127.32, 37.52], [127.49, 37.49]]);
  // 그날 출발 안내도 같은 실측값을 쓴다.
  assert.equal(scheduled.departure?.minutes, 70);
  assert.equal(scheduled.departure?.meters, 54_000);
});

test("조회표에 없는 구간은 어림값으로 메우고 실측 흔적을 남기지 않는다", () => {
  // 첫 구간만 실측, 둘째 구간은 미스 — 한 코스 안에 실측과 추정이 섞이는 경우다.
  const legs = lookupOf([[SEOUL_ORIGIN, DUMULMERI, { meters: 54_000, minutes: 70 }]]);

  const [scheduled] = scheduleItinerary(DAY_TRIP, legs);

  assert.equal(scheduled.stops[1].travelMinutes, driveMinutes(DUMULMERI, YANGPYEONG_STATION));
  assert.equal("travelMeters" in scheduled.stops[1], false);
  assert.equal("routeFromPrev" in scheduled.stops[1], false);
});

test("지난번 실측값이 붙어 있어도 미스 구간이면 지운다", () => {
  // 커밋된 큐레이션 JSON이나 옛 찜 스냅샷으로 들어온 코스를 흉내낸다.
  const stale: ItineraryDay[] = [
    {
      day: 1,
      stops: [
        { ...stop("두물머리", "attraction", DUMULMERI), travelMeters: 99_999, routeFromPrev: [[127.0, 37.0]] },
      ],
    },
  ];

  const [scheduled] = scheduleItinerary(stale);

  assert.equal("travelMeters" in scheduled.stops[0], false);
  assert.equal("routeFromPrev" in scheduled.stops[0], false);
});

test("정체 때 재서 평균 속도가 비상식적인 구간은 시간만 다시 센다", () => {
  const legs = lookupOf([
    // 54km를 9시간 — 사고로 막힌 순간에 받은 값이다(시속 6km).
    [SEOUL_ORIGIN, DUMULMERI, { meters: 54_000, minutes: 540, path: [[127.0, 37.3]] }],
  ]);

  const [scheduled] = scheduleItinerary(DAY_TRIP, legs);

  // 시간은 다시 세지만, 거리와 경로는 교통과 무관하므로 실측값을 그대로 쓴다.
  assert.ok(scheduled.stops[0].travelMinutes! < 540, `${scheduled.stops[0].travelMinutes}분`);
  assert.equal(scheduled.stops[0].travelMeters, 54_000);
  assert.deepEqual(scheduled.stops[0].routeFromPrev, [[127.0, 37.3]]);
  // 54km에 거리대별 평균 속도(42km/h)를 적용한 값 — 직선거리로 되돌리지 않는다.
  assert.equal(scheduled.stops[0].travelMinutes, 75);
});

test("직선거리의 세 배를 넘는 우회로도 그대로 믿는다", () => {
  // 서후리숲→카페무르는 직선 6.9km인데 도로로는 27.7km다(2026-10-31 실측).
  // 양평 산길에서는 흔한 일이라, 직선거리로 상한을 두면 정상 구간을 버리게 된다.
  const legs = lookupOf([[DUMULMERI, YANGPYEONG_STATION, { meters: 60_000, minutes: 60 }]]);
  const days: ItineraryDay[] = [{ day: 1, stops: [stop("점심집", "restaurant", YANGPYEONG_STATION)] }];
  const fromDumulmeri: ItineraryDay[] = [
    { day: 1, stops: [stop("두물머리", "attraction", DUMULMERI), ...days[0].stops] },
  ];

  const [scheduled] = scheduleItinerary(fromDumulmeri, legs);

  assert.equal(scheduled.stops[1].travelMeters, 60_000);
  assert.equal(scheduled.stops[1].travelMinutes, 60);
});

test("스케줄러가 조회하는 구간은 courseLegPairs가 열거한 것과 같다", () => {
  // 구간 열거가 두 곳으로 갈라지면 캐시가 조용히 전부 미스가 된다 —
  // 빌드 스크립트(scripts/build-routes.ts)가 courseLegPairs로 미리 받아 두기 때문이다.
  const twoDays: ItineraryDay[] = [
    {
      day: 1,
      stops: [
        stop("두물머리", "attraction", DUMULMERI),
        stop("저녁집", "restaurant", YANGPYEONG_STATION),
        stop("펜션", "lodging", YONGMUNSA),
      ],
    },
    { day: 2, stops: [stop("아침카페", "cafe", YANGPYEONG_STATION)] },
  ];

  for (const days of [DAY_TRIP, twoDays]) {
    const asked: string[] = [];
    const spy: RouteLegLookup = (from, to) => {
      asked.push(`${from.lat},${from.lng}|${to.lat},${to.lng}`);
      return undefined;
    };
    scheduleItinerary(days, spy);

    const expected = courseLegPairs(days).map((p) => `${p.from.lat},${p.from.lng}|${p.to.lat},${p.to.lng}`);
    assert.deepEqual(asked, expected);
  }
});

test("2일 코스의 구간은 서울 출발·숙소 승계·복귀를 모두 담는다", () => {
  const twoDays: ItineraryDay[] = [
    {
      day: 1,
      stops: [stop("두물머리", "attraction", DUMULMERI), stop("펜션", "lodging", YONGMUNSA)],
    },
    { day: 2, stops: [stop("아침카페", "cafe", YANGPYEONG_STATION)] },
  ];

  const pairs = courseLegPairs(twoDays);

  assert.deepEqual(
    pairs.map((p) => p.kind),
    ["origin", "stop", "origin", "home"],
  );
  // 1일차는 서울에서, 2일차는 전날 묵은 펜션에서 나선다.
  assert.deepEqual(pairs[0].from, SEOUL_ORIGIN);
  assert.equal(pairs[2].from.lat, YONGMUNSA.lat);
  // 마지막 날은 서울로 돌아온다.
  assert.deepEqual(pairs[3].to, SEOUL_ORIGIN);
});
