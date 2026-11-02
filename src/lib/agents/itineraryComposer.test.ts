import { strict as assert } from "node:assert";
import { test } from "node:test";
import { composeItinerary } from "./itineraryComposer";
import { normalizePlaceName } from "@/lib/placeIdentity";

// 반려동물 동반은 후보 풀이 스냅샷의 petFriendly 장소뿐이고, 그중 관광지는 0곳이다
// ("반려동물 동반 가능 업소 현황"에 음식점·카페만 올라와 있다). 이 테스트는 그래도
// 하루가 비지 않는지 — 관광지 자리를 카페로 메우는지 — 를 지킨다.
test("반려동물 코스도 관광지 후보가 없다고 하루를 비우지 않는다", async () => {
  const [day] = await composeItinerary({
    durationDays: 1,
    tags: ["pet_friendly"],
    requirePetFriendly: true,
  });

  assert.equal(day.stops.length, 5, "당일치기 다섯 자리가 모두 찬다");
  assert.ok(
    day.stops.every((stop) => stop.petFriendly === true),
    "대체로 채운 자리도 동반 가능한 곳이어야 한다",
  );
  assert.equal(day.stops.filter((stop) => stop.category === "restaurant").length, 2, "끼니는 두 번 그대로");
  assert.ok(day.arrival, "마지막 날이니 서울 복귀 시각이 붙는다");
});

test("반려동물 1박 2일은 전날 묵은 숙소에서 둘째 날을 시작한다", async () => {
  const days = await composeItinerary({
    durationDays: 2,
    tags: ["pet_friendly"],
    requirePetFriendly: true,
  });

  assert.equal(days.length, 2);
  const lodging = days[0].stops.find((stop) => stop.category === "lodging");
  assert.ok(lodging, "1일차 끝에 숙소가 있다");
  assert.equal(days[1].departure?.place, lodging?.name);
  assert.equal(days[1].departure?.at, "10:00");
});

// 한 화면에 코스 세 장을 같이 보여주므로(offset 0·1·2), 코스 사이에 같은 장소가
// 끼면 "중복 추천"으로 보인다. offset 보폭이 슬롯 수뿐이던 동안 "비 오는 날 아이랑"
// 1박 2일에서 아홉 곳 중 네 곳이 겹쳤다 — candidateStride() 주석 참조.
test("한 화면에 함께 나오는 코스들은 장소를 공유하지 않는다", async () => {
  const tags = ["indoor", "kid_friendly", "experience"];
  const courses = await Promise.all(
    [0, 1, 2].map((offset) => composeItinerary({ durationDays: 2, tags, offset })),
  );

  const placeIds = courses.map((days) => days.flatMap((d) => d.stops).map((s) => s.placeId));
  for (let i = 0; i < placeIds.length; i += 1) {
    for (let j = i + 1; j < placeIds.length; j += 1) {
      const shared = placeIds[i].filter((id) => placeIds[j].includes(id));
      assert.deepEqual(shared, [], `코스 ${i}와 코스 ${j}가 같은 장소를 쓴다`);
    }
  }
});

test("한 코스 안에 같은 장소가 두 번 들어가지 않는다", async () => {
  const days = await composeItinerary({
    durationDays: 2,
    tags: ["indoor", "kid_friendly", "experience"],
  });
  const stops = days.flatMap((day) => day.stops);

  assert.equal(new Set(stops.map((s) => s.placeId)).size, stops.length, "같은 placeId가 두 번 나온다");
  // 출처마다 ID가 달라도(네이버/TourAPI) 같은 업체면 한 번만 나와야 한다.
  assert.equal(
    new Set(stops.map((s) => normalizePlaceName(s.name))).size,
    stops.length,
    "같은 이름이 두 번 나온다",
  );
});

test("일반 코스는 관광지 자리를 그대로 관광지로 채운다", async () => {
  const [day] = await composeItinerary({ durationDays: 1, tags: ["healing"] });

  assert.equal(day.stops.length, 5);
  assert.equal(day.stops[0].category, "attraction");
  assert.equal(day.stops[2].category, "attraction");
});
