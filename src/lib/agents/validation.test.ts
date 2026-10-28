// 실행: npm test
// 영업시간 문자열은 TourAPI detailIntro2가 양평 장소에 실제로 돌려준 표기를 쓴다
// (src/lib/businessHours.test.ts와 같은 출처). 요일 기준은 테스트가 돌는 날짜에
// 흔들리지 않도록 visitWeekday로 못박는다.
import assert from "node:assert/strict";
import { test } from "node:test";
import { validateItinerary } from "./validation";
import { Category, ItineraryDay, ItineraryStop } from "@/types/travel";

const MON = 1;
const WED = 3;
const SAT = 6;

function stop(overrides: Partial<ItineraryStop> & { name: string; timeSlot: string }): ItineraryStop {
  return {
    placeId: `test_${overrides.name}`,
    category: "restaurant" as Category,
    lat: 37.49,
    lng: 127.49,
    address: "경기도 양평군",
    photos: [],
    mapUrl: "https://map.naver.com/",
    tags: [],
    ...overrides,
  };
}

function day(dayNumber: number, stops: ItineraryStop[]): ItineraryDay {
  return { day: dayNumber, stops };
}

test("정기휴무 요일에 배정된 장소는 반려한다", () => {
  const result = validateItinerary(
    [day(1, [stop({ name: "수요일휴무식당", timeSlot: "12:00-13:30", businessHoursRaw: "09:00~18:00 / 휴무: 매주 수요일" })])],
    { visitWeekday: WED },
  );

  assert.equal(result.approved, false);
  assert.equal(result.issues.length, 1);
  assert.match(result.issues[0].reason, /수요일은 정기휴무/);
  assert.deepEqual(result.rejectPlaceIds, ["test_수요일휴무식당"]);
});

test("휴무가 아닌 요일이면 통과시킨다", () => {
  const result = validateItinerary(
    [day(1, [stop({ name: "수요일휴무식당", timeSlot: "12:00-13:30", businessHoursRaw: "09:00~18:00 / 휴무: 매주 수요일" })])],
    { visitWeekday: SAT },
  );

  assert.equal(result.approved, true);
  assert.deepEqual(result.issues, []);
});

test("배정된 시간에 문을 열지 않으면 반려하고 오픈 시각을 알린다", () => {
  const result = validateItinerary(
    [day(1, [stop({ name: "오후오픈카페", category: "cafe", timeSlot: "10:30-12:00", businessHoursRaw: "13:00~22:00" })])],
    { visitWeekday: SAT },
  );

  assert.equal(result.approved, false);
  assert.match(result.issues[0].reason, /10:30-12:00에는 영업하지 않습니다\. \(13:00 오픈\)/);
});

test("영업시간을 모르는 장소는 반려하지 않고 알림으로만 남긴다", () => {
  const result = validateItinerary(
    [day(1, [stop({ name: "출처없는카페", category: "cafe", timeSlot: "14:00-15:00" })])],
    { visitWeekday: SAT },
  );

  assert.equal(result.approved, true);
  assert.equal(result.notices.length, 1);
  assert.match(result.notices[0].reason, /영업시간이 확인되지 않았습니다/);
});

test("숙소는 체크인 시각만 있어 검증하지 않는다", () => {
  const result = validateItinerary(
    [day(1, [stop({ name: "펜션", category: "lodging", timeSlot: "20:00" })])],
    { visitWeekday: SAT },
  );

  assert.equal(result.approved, true);
  assert.deepEqual(result.notices, []);
});

test("2일차는 다음 날 요일로 검증한다", () => {
  const monday = stop({ name: "월요일휴무식당", timeSlot: "12:00-13:30", businessHoursRaw: "09:00~18:00 / 휴무: 매주 월요일" });
  // 1일차가 일요일이면 2일차가 월요일 — 2일차에 배정됐을 때만 걸려야 한다.
  const asDay1 = validateItinerary([day(1, [monday])], { visitWeekday: 0 });
  const asDay2 = validateItinerary([day(1, [stop({ name: "무휴식당", timeSlot: "12:00-13:30", businessHoursRaw: "매일 09:00~18:00" })]), day(2, [monday])], { visitWeekday: 0 });

  assert.equal(asDay1.approved, true);
  assert.equal(asDay2.approved, false);
  assert.equal(asDay2.issues[0].day, 2);
});

test("일정이 끝나기 전에 마감하는 곳은 알림만 남긴다", () => {
  const result = validateItinerary(
    [day(1, [stop({ name: "일찍닫는카페", category: "cafe", timeSlot: "14:00-15:00", businessHoursRaw: "10:00~14:30" })])],
    { visitWeekday: SAT },
  );

  assert.equal(result.approved, true);
  assert.match(result.notices[0].reason, /끝나기 전에 영업을 마칩니다/);
});

test("자정을 넘겨 영업하는 곳은 마감이 이르다고 보지 않는다", () => {
  const result = validateItinerary(
    [day(1, [stop({ name: "새벽까지식당", timeSlot: "18:00-19:30", businessHoursRaw: "평일 15:00~03:00 주말 11:00~03:00" })])],
    { visitWeekday: MON },
  );

  assert.equal(result.approved, true);
  assert.deepEqual(result.notices, []);
});

test("일정이 비어 있으면 되살릴 수 없는 문제로 본다", () => {
  assert.equal(validateItinerary([]).fatal, "생성된 일정이 없습니다.");
  assert.equal(validateItinerary([day(1, [])]).fatal, "일부 날짜에 배정 가능한 장소가 없습니다.");
});
