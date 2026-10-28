// 실행: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { distanceKm, estimateMinutes, formatDistance, nearest } from "./geo";

// 양평군청과 두물머리 — 실제 좌표. 직선거리는 약 10km다.
const YANGPYEONG_OFFICE = { lat: 37.4917, lng: 127.4875 };
const DUMULMERI = { lat: 37.5339, lng: 127.3233 };

test("두 좌표 사이 직선거리를 km로 돌려준다", () => {
  const km = distanceKm(YANGPYEONG_OFFICE, DUMULMERI);
  assert.ok(km > 14 && km < 16, `예상 14~16km, 실제 ${km.toFixed(2)}km`);
});

test("같은 좌표는 0km", () => {
  assert.equal(distanceKm(YANGPYEONG_OFFICE, YANGPYEONG_OFFICE), 0);
});

test("1km 미만은 m로, 그 이상은 0.1km 단위로 적는다", () => {
  assert.equal(formatDistance(0.32), "320m");
  assert.equal(formatDistance(0.004), "10m"); // 0m으로 적지 않는다
  assert.equal(formatDistance(1.24), "1.2km");
  assert.equal(formatDistance(15.07), "15.1km");
});

test("이동시간 어림값은 최소 1분", () => {
  assert.equal(estimateMinutes(0.01, "car"), 1);
  assert.equal(estimateMinutes(15, "car"), 30); // 시속 30km 기준
  assert.equal(estimateMinutes(2, "walk"), 30); // 시속 4km 기준
});

test("가장 가까운 항목과 거리를 함께 돌려준다", () => {
  const found = nearest(YANGPYEONG_OFFICE, [
    { lat: DUMULMERI.lat, lng: DUMULMERI.lng, name: "두물머리" },
    { lat: 37.4925, lng: 127.4881, name: "양평물맑은시장" },
  ]);

  assert.equal(found?.item.name, "양평물맑은시장");
  assert.ok((found?.km ?? 1) < 0.2);
});

test("빈 목록은 null", () => {
  assert.equal(nearest(YANGPYEONG_OFFICE, []), null);
});
