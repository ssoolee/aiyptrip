// 실행: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { decodePath, encodePath, simplifyPath, type RoutePoint } from "./routePath";

// 양평 안의 동서 방향 직선 — 경도만 늘려 만든다. 위도 37.5에서 경도 0.001도는 약 88m다.
function straightEastward(count: number): RoutePoint[] {
  return Array.from({ length: count }, (_, i) => [127.3 + i * 0.001, 37.5] as RoutePoint);
}

test("직선 위의 중간점은 걷어낸다", () => {
  const simplified = simplifyPath(straightEastward(10), 20);
  assert.deepEqual(simplified, [
    [127.3, 37.5],
    [127.309, 37.5],
  ]);
});

test("허용치보다 많이 벗어난 굽이는 남긴다", () => {
  // 가운데 점을 북쪽으로 0.001도(약 111m) 밀어 꺾이게 한다.
  const bent: RoutePoint[] = [
    [127.3, 37.5],
    [127.301, 37.501],
    [127.302, 37.5],
  ];
  assert.equal(simplifyPath(bent, 20).length, 3);
  // 같은 꺾임도 허용치를 200m로 키우면 직선으로 봐 준다.
  assert.equal(simplifyPath(bent, 200).length, 2);
});

test("시작점과 끝점은 언제나 남는다", () => {
  const path = straightEastward(50);
  const simplified = simplifyPath(path, 1000);
  assert.deepEqual(simplified[0], path[0]);
  assert.deepEqual(simplified[simplified.length - 1], path[path.length - 1]);
});

test("점이 둘 이하인 경로는 그대로 둔다", () => {
  const two: RoutePoint[] = [
    [127.3, 37.5],
    [127.4, 37.6],
  ];
  assert.deepEqual(simplifyPath(two, 20), two);
  assert.deepEqual(simplifyPath([], 20), []);
});

test("적었다 되읽으면 5자리 안에서 같다", () => {
  const path: RoutePoint[] = [
    [127.3169067, 37.5348957],
    [127.3251103, 37.5269812],
  ];
  const restored = decodePath(encodePath(path));
  assert.equal(restored.length, 2);
  for (const [i, [lng, lat]] of restored.entries()) {
    assert.ok(Math.abs(lng - path[i][0]) < 1e-5, `경도 ${lng}`);
    assert.ok(Math.abs(lat - path[i][1]) < 1e-5, `위도 ${lat}`);
  }
});

test("빈 문자열과 깨진 좌표는 건너뛴다", () => {
  assert.deepEqual(decodePath(""), []);
  assert.deepEqual(decodePath("127.3,37.5;;abc,37.6"), [[127.3, 37.5]]);
});
