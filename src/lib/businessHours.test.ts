// 실행: npm test
// 입력 문자열은 모두 TourAPI detailIntro2가 양평 장소에 실제로 돌려준 값이다
// (scripts/build-hours.ts가 모아 저장하는 형식). 형식이 제각각이라 회귀가 나기 쉬워
// 대표 유형을 고정해 둔다.
import assert from "node:assert/strict";
import { test } from "node:test";
import { formatRange, getHoursStatus, parseBusinessHours, WEEKDAY_LABELS } from "./businessHours";

/** 요일별 영업시간을 "월:09:00 - 18:00 화:휴무 …" 꼴로 납작하게 만든다. */
function table(raw: string): string {
  const parsed = parseBusinessHours(raw);
  if (!parsed) return "(파싱 실패)";
  return parsed.days
    .map((d) => `${WEEKDAY_LABELS[d.weekday]}:${d.closed ? "휴무" : d.ranges.map(formatRange).join("/")}`)
    .join(" ");
}

const at = (weekday: number, hour: number, minute = 0) => ({ weekday, minutes: hour * 60 + minute });

test("요일 범위와 휴무일을 함께 읽는다", () => {
  assert.equal(
    table("09:00~18:00 / 휴무: 매주 수요일"),
    "일:09:00 - 18:00 월:09:00 - 18:00 화:09:00 - 18:00 수:휴무 목:09:00 - 18:00 금:09:00 - 18:00 토:09:00 - 18:00",
  );
});

test("상시 개방은 24시간으로 본다", () => {
  assert.equal(table("상시 개방"), "일:24시간 월:24시간 화:24시간 수:24시간 목:24시간 금:24시간 토:24시간");
});

test("라스트오더 시각을 영업시간으로 읽지 않는다", () => {
  const sunday = (raw: string) => parseBusinessHours(raw)?.days.find((d) => d.weekday === 0)?.ranges.map(formatRange);
  assert.deepEqual(sunday("매일 06:00 - 20:30 (20:00 라스트오더)"), ["06:00 - 20:30"]);
  assert.deepEqual(sunday("09:30~20:00 (마지막 주문 19:30)"), ["09:30 - 20:00"]);
  assert.match(parseBusinessHours("09:30~20:00 (마지막 주문 19:30)")?.note ?? "", /마지막 주문 19:30/);
});

test("브레이크타임을 영업시간으로 읽지 않는다", () => {
  const parsed = parseBusinessHours("10:30~20:00 (브레이크타임 14:30~17:00) / 휴무: 매주 월요일 휴무");
  assert.ok(parsed);
  assert.deepEqual(parsed.days.find((d) => d.weekday === 2)?.ranges.map(formatRange), ["10:30 - 20:00"]);
  assert.equal(parsed.days.find((d) => d.weekday === 1)?.closed, true);
  assert.match(parsed.note ?? "", /브레이크타임/);
});

// 주 단위 표로 옮기면 "매주 화요일 휴무"가 되어 사실과 달라진다. 비고로만 남겨야 한다.
test("달 단위 휴무는 요일을 휴무로 만들지 않는다", () => {
  const parsed = parseBusinessHours("11:00~17:00 (마지막 주문 16:30) / 휴무: 매월 둘째 화요일");
  assert.ok(parsed);
  assert.equal(parsed.days.find((d) => d.weekday === 2)?.closed, false);
  assert.match(parsed.note ?? "", /매월 둘째 화요일/);
});

test("쉼표가 든 달 단위 휴무도 요일을 휴무로 만들지 않는다", () => {
  const parsed = parseBusinessHours("09:30~20:00 / 휴무: 매월 첫째, 셋째 월요일");
  assert.ok(parsed);
  assert.equal(parsed.days.find((d) => d.weekday === 1)?.closed, false);
});

test("연중무휴를 휴무로 읽지 않는다", () => {
  const parsed = parseBusinessHours("10:30~20:00 / 휴무: 연중무휴");
  assert.ok(parsed);
  assert.ok(parsed.days.every((d) => !d.closed));
});

test("구분자 없이 이어진 평일·주말 구간을 나눈다", () => {
  const parsed = parseBusinessHours("평일 15:00~03:00 주말 11:00~03:00 (마지막 주문 02:45) / 휴무: 매주 화요일");
  assert.ok(parsed);
  assert.deepEqual(parsed.days.find((d) => d.weekday === 1)?.ranges.map(formatRange), ["15:00 - 익일 03:00"]);
  assert.deepEqual(parsed.days.find((d) => d.weekday === 6)?.ranges.map(formatRange), ["11:00 - 익일 03:00"]);
  assert.equal(parsed.days.find((d) => d.weekday === 2)?.closed, true);
});

test("대괄호로 묶인 평일·주말 구간을 나눈다", () => {
  const parsed = parseBusinessHours(
    "[평일] - 11:00~20:00 - 마지막 주문 19:30 [주말] - 10:00~21:00 - 마지막 주문 20:30",
  );
  assert.ok(parsed);
  assert.deepEqual(parsed.days.find((d) => d.weekday === 3)?.ranges.map(formatRange), ["11:00 - 20:00"]);
  assert.deepEqual(parsed.days.find((d) => d.weekday === 0)?.ranges.map(formatRange), ["10:00 - 21:00"]);
});

test("요일 범위 표기를 펼친다", () => {
  assert.equal(
    table("월~금 09:00-18:00, 토 10:00-15:00, 일 휴무"),
    "일:휴무 월:09:00 - 18:00 화:09:00 - 18:00 수:09:00 - 18:00 목:09:00 - 18:00 금:09:00 - 18:00 토:10:00 - 15:00",
  );
});

test("해석할 수 없는 텍스트는 null", () => {
  assert.equal(parseBusinessHours("전화 문의"), null);
  assert.equal(parseBusinessHours(""), null);
  assert.equal(parseBusinessHours(undefined), null);
});

test("지금 기준 영업 상태를 판정한다", () => {
  const weekday = parseBusinessHours("09:00~18:00 / 휴무: 매주 수요일");
  assert.deepEqual(getHoursStatus(weekday, at(1, 13)), { kind: "open", closesAt: "18:00" });
  assert.deepEqual(getHoursStatus(weekday, at(3, 13)), { kind: "dayoff" });
  assert.deepEqual(getHoursStatus(weekday, at(1, 7)), { kind: "closed", opensAt: "09:00" });
  // 영업이 끝난 뒤에는 다음 영업일을 알려준다 (수요일은 휴무라 건너뛴다).
  assert.deepEqual(getHoursStatus(weekday, at(2, 20)), { kind: "closed", opensAt: "09:00", opensWeekday: 4 });
});

test("자정을 넘긴 영업은 다음 날 새벽에도 영업 중", () => {
  const overnight = parseBusinessHours("18:00-02:00");
  assert.deepEqual(getHoursStatus(overnight, at(5, 1)), { kind: "open", closesAt: "02:00" });
});

test("24시간 영업은 마감 시각 없이 영업 중", () => {
  assert.deepEqual(getHoursStatus(parseBusinessHours("24시간"), at(4, 3)), { kind: "open" });
});

test("영업시간을 모르면 unknown", () => {
  assert.deepEqual(getHoursStatus(null, at(1, 10)), { kind: "unknown" });
});
