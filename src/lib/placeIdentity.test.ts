import { strict as assert } from "node:assert";
import { test } from "node:test";
import { dedupePlaces, isSamePlace, normalizePlaceName } from "./placeIdentity";
import { Place } from "@/types/travel";

function place(overrides: Partial<Place> & { name: string }): Place {
  return {
    placeId: overrides.name,
    category: "restaurant",
    lat: 37.5042,
    lng: 127.4423,
    address: "경기도 양평군",
    photos: [],
    mapUrl: "",
    tags: [],
    ...overrides,
  };
}

test("지점 이름이 붙은 쪽과 안 붙은 쪽을 같은 업체로 본다", () => {
  // 스냅샷에 실제로 둘 다 들어와 있던 쌍 (네이버/TourAPI, 좌표 20m 차이).
  const naver = place({ placeId: "naver_1274423732_375042162", name: "쏭바베큐 양평본점" });
  const tour = place({ placeId: "tour_2755793", name: "쏭바베큐", lat: 37.5041754, lng: 127.4421473 });

  assert.equal(isSamePlace(naver, tour), true);
  assert.deepEqual(dedupePlaces([naver, tour]).map((p) => p.placeId), [naver.placeId], "앞선 항목만 남는다");
});

test("이름이 포함돼도 멀리 있으면 다른 업체다", () => {
  const a = place({ name: "양평해장국", lat: 37.49, lng: 127.49 });
  const b = place({ name: "본가양평해장국 양평지점", lat: 37.56, lng: 127.33 });

  assert.equal(isSamePlace(a, b), false);
});

test("이름이 같으면 좌표를 보지 않는다", () => {
  // 같은 업체를 출처마다 다른 좌표(건물 중심/입구)로 주는 경우가 있다.
  const a = place({ placeId: "naver_1", name: "구벼울" });
  const b = place({ placeId: "tour_1", name: "구 벼울", lat: 37.52, lng: 127.47 });

  assert.equal(isSamePlace(a, b), true);
});

test("한 글자 이름은 포함 비교로 합치지 않는다", () => {
  const a = place({ name: "곳", lat: 37.5042, lng: 127.4423 });
  const b = place({ name: "곳간", lat: 37.5042, lng: 127.4423 });

  assert.equal(isSamePlace(a, b), false);
});

test("정규화는 공백·가운뎃점·괄호를 뗀다", () => {
  assert.equal(normalizePlaceName("사나사 (양평)"), "사나사양평");
  assert.equal(normalizePlaceName("두물머리 · 연핫도그"), "두물머리연핫도그");
});
