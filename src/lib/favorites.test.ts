import { test } from "node:test";
import assert from "node:assert/strict";
import { toPlaceSnapshot } from "@/lib/favorites";
import type { ItineraryStop, Place } from "@/types/travel";

const place: Place = {
  placeId: "naver_1_2",
  name: "테스트카페",
  category: "cafe",
  lat: 37.49,
  lng: 127.49,
  address: "경기 양평군 양평읍",
  photos: [],
  mapUrl: "https://map.naver.com/p/search/테스트카페",
  tags: ["healing"],
};

test("값이 없는 필드는 스냅샷에서 뺀다 — Firestore가 undefined를 거부한다", () => {
  const snapshot = toPlaceSnapshot({ ...place, phone: undefined, rating: undefined });
  assert.ok(!("phone" in snapshot));
  assert.ok(!("rating" in snapshot));
  assert.equal(snapshot.name, "테스트카페");
  assert.deepEqual(snapshot.tags, ["healing"]);
});

test("코스 스팟으로 찜해도 시간대·추천 이유는 남기지 않는다", () => {
  const stop: ItineraryStop = { ...place, timeSlot: "14:00-15:00", reason: "뷰가 좋아서" };
  const snapshot = toPlaceSnapshot(stop) as Partial<ItineraryStop>;
  assert.equal(snapshot.timeSlot, undefined);
  assert.equal(snapshot.reason, undefined);
});

test("있는 값은 그대로 둔다", () => {
  const snapshot = toPlaceSnapshot({ ...place, phone: "031-123-4567", businessHoursRaw: "09:00~18:00" });
  assert.equal(snapshot.phone, "031-123-4567");
  assert.equal(snapshot.businessHoursRaw, "09:00~18:00");
});
