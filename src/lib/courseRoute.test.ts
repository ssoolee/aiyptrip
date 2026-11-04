import assert from "node:assert/strict";
import test from "node:test";
import { courseDistance, legDistance } from "@/lib/courseRoute";
import { distanceKm } from "@/lib/geo";
import type { ItineraryDay, ItineraryStop } from "@/types/travel";

// 화면이 "직선거리"와 "주행거리" 중 무엇을 적을지 고르는 규칙. 상세 화면은 클라이언트
// 컴포넌트라 테스트가 닿지 않으므로, 그 판단을 여기로 빼 두고 여기서 지킨다.
//
// 실제로 틀렸던 것이 이 규칙이다 — 실측 주행거리가 스팟에 들어와 있는데도 상세 화면이
// 직선거리를 다시 계산해, 같은 코스가 목록에서는 79.5km(주행거리), 상세에서는
// 30.3km(직선거리)로 나왔다.

function stop(lat: number, lng: number, extra: Partial<ItineraryStop> = {}): ItineraryStop {
  return {
    placeId: `p_${lat}_${lng}`,
    name: "장소",
    category: "cafe",
    lat,
    lng,
    address: "경기도 양평군",
    photos: [],
    mapUrl: "https://map.naver.com/",
    tags: [],
    timeSlot: "12:00-13:00",
    ...extra,
  };
}

const 양수리 = stop(37.5407, 127.3241);
const 서종 = stop(37.6249, 127.3547);

test("구간 거리는 뒤쪽 스팟의 실측 주행거리를 쓴다", () => {
  const to = stop(37.6249, 127.3547, { travelMeters: 22_200 });
  const leg = legDistance(양수리, to);

  assert.equal(leg.measured, true);
  assert.equal(leg.km, 22.2);
  // 직선거리를 쓰고 있었다면 이 값과 같았을 것이다.
  assert.notEqual(leg.km, distanceKm(양수리, to));
});

test("실측이 없으면 직선거리로 떨어진다", () => {
  // 그때그때 만드는 코스는 캐시에 없는 구간이 생긴다 — 이 분기가 계속 돌아야 한다.
  const leg = legDistance(양수리, 서종);

  assert.equal(leg.measured, false);
  assert.equal(leg.km, distanceKm(양수리, 서종));
});

test("앞 스팟의 travelMeters는 그 구간의 거리가 아니다", () => {
  // travelMeters는 "직전 지점에서 여기까지"라 뒤쪽에 붙는다. 앞쪽 것을 읽으면
  // 한 구간 앞의 값을 적게 된다 — 그날 첫 스팟이면 서울에서 오는 구간이다.
  const from = stop(37.5407, 127.3241, { travelMeters: 48_000 });
  const leg = legDistance(from, 서종);

  assert.equal(leg.measured, false);
  assert.equal(leg.km, distanceKm(from, 서종));
});

/** 하루치 일정. 첫 스팟의 travelMeters는 출발지에서 오는 구간이다. */
function day(dayNumber: number, stops: ItineraryStop[]): ItineraryDay {
  return { day: dayNumber, stops };
}

test("전 구간이 실측이면 주행거리 합을 돌려준다", () => {
  const total = courseDistance([
    day(1, [
      stop(37.54, 127.32, { travelMeters: 48_000 }), // 서울 → 첫 스팟 (세지 않는다)
      stop(37.62, 127.35, { travelMeters: 8_300 }),
      stop(37.63, 127.36, { travelMeters: 22_200 }),
    ]),
  ]);

  assert.equal(total.measured, true);
  assert.equal(total.km, 30.5);
});

test("한 구간이라도 비면 직선거리 합으로 돌아간다", () => {
  // 절반은 주행거리, 절반은 직선거리인 숫자 하나를 내놓지 않는다.
  const stops = [
    stop(37.54, 127.32, { travelMeters: 48_000 }),
    stop(37.62, 127.35, { travelMeters: 8_300 }),
    stop(37.63, 127.36), // 실측 없음
  ];
  const total = courseDistance([day(1, stops)]);

  assert.equal(total.measured, false);
  const straight = stops.slice(1).reduce((sum, s, i) => sum + distanceKm(stops[i], s), 0);
  assert.equal(total.km, straight);
});

test("1일차 첫 스팟의 서울 구간은 총거리에 넣지 않는다", () => {
  // 화면에 적은 "N곳을 차례로 이은 동선"과 어긋나지 않아야 한다.
  const withSeoul = courseDistance([
    day(1, [
      stop(37.54, 127.32, { travelMeters: 48_000 }),
      stop(37.62, 127.35, { travelMeters: 8_300 }),
    ]),
  ]);

  assert.equal(withSeoul.measured, true);
  assert.equal(withSeoul.km, 8.3, "서울에서 오는 48km가 섞이면 안 된다");
});
