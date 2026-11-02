import { strict as assert } from "node:assert";
import { test } from "node:test";
import { generateCourses } from "./orchestrator";
import { TripConditions } from "@/lib/agents/requestInterpreter";
import { normalizePlaceName } from "@/lib/placeIdentity";
import { Course } from "@/types/travel";

// 외부 키 없이 도는 테스트다 — 실시간 조회(네이버·TourAPI)와 LLM은 빈 결과로 떨어지고
// 스냅샷 후보만으로 코스가 만들어진다.

function places(course: Course) {
  return course.days.flatMap((day) => day.stops.map((stop) => ({ placeId: stop.placeId, name: stop.name })));
}

function sharedPlaces(courses: Course[]): string[] {
  const shared: string[] = [];
  for (let i = 0; i < courses.length; i += 1) {
    for (let j = i + 1; j < courses.length; j += 1) {
      const other = places(courses[j]);
      for (const place of places(courses[i])) {
        const same = other.some(
          (o) => o.placeId === place.placeId || normalizePlaceName(o.name) === normalizePlaceName(place.name),
        );
        if (same) shared.push(place.name);
      }
    }
  }
  return [...new Set(shared)];
}

// 후보가 가장 빠듯한 조건이다 — 반려동물 동반은 관광지가 0곳이라 관광지 자리까지
// 카페(15곳)가 메우고, 1박 2일 한 장이 카페를 다섯 자리나 쓴다. offset을 벌리는
// 것만으로는 세 장이 장소를 나눠 가질 수 없어, 앞 코스가 쓴 곳을 빼고 구성한다.
test("한 번에 보여 주는 코스들은 장소를 나눠 갖는다 — 반려동물 1박 2일", async () => {
  const courses = await generateCourses({ presetType: "pet", count: 3, durationDays: 2 });

  assert.ok(courses.length >= 2, `코스가 ${courses.length}장만 나왔다`);
  assert.deepEqual(sharedPlaces(courses), [], "코스끼리 같은 장소를 쓴다");
});

test("'더 보기'는 이미 보여 준 장소를 다시 쓰지 않는다", async () => {
  const conditions: TripConditions = {
    tags: ["indoor", "kid_friendly", "experience"],
    durationDays: 2,
    requirePetFriendly: false,
    companionLabel: "아이와 함께",
    highlights: [],
    source: "rules" as const,
  };
  const first = await generateCourses({ presetType: "custom", count: 3, conditions });
  const more = await generateCourses({
    presetType: "custom",
    count: 3,
    offsetStart: 3,
    conditions,
    // CourseResults가 화면에 있는 장소를 이렇게 넘긴다.
    excludePlaces: first.flatMap(places),
  });

  assert.ok(more.length > 0, "더 보기에서 코스가 나오지 않았다");
  assert.deepEqual(sharedPlaces([...first, ...more]), [], "앞 화면과 같은 장소를 다시 쓴다");
});
