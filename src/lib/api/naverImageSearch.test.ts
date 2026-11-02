import { test } from "node:test";
import assert from "node:assert/strict";

// 네트워크를 타지 않고 fetch만 바꿔 끼운다 (naverBlogSearch.test.ts와 같은 방식).
function withFetch(body: unknown, status = 200) {
  const original = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    calls.push(String(input));
    return new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
  return { calls, restore: () => void (globalThis.fetch = original) };
}

function item(title: string, overrides: Record<string, string> = {}) {
  return {
    title,
    link: "https://pup-post-phinf.pstatic.net/full.jpg",
    thumbnail: "https://search.pstatic.net/common/?type=b150&src=full.jpg",
    sizewidth: "1080",
    sizeheight: "1440",
    ...overrides,
  };
}

test("제목에 장소 이름이 적힌 사진만 고른다", async () => {
  process.env.NCP_SEARCH_KEY_ID = "test-id";
  process.env.NCP_SEARCH_KEY = "test-secret";
  // 실측에서 "양평 흑유재"를 찾으면 신발 사진이 섞여 나왔다.
  const { restore } = withFetch({
    items: [item("Palace x Arc'teryx STYLE | KREAM"), item("#오늘클립 #흑유재 #양평카페 갤러리 같은 카페")],
  });
  try {
    const { searchPlaceImage } = await import("@/lib/api/naverImageSearch");
    const image = await searchPlaceImage("흑유재");
    assert.equal(image?.title, "#오늘클립 #흑유재 #양평카페 갤러리 같은 카페");
    assert.ok(image?.thumbnail.startsWith("https://search.pstatic.net/"));
  } finally {
    restore();
  }
});

test("원본이 아니라 썸네일을 쓴다 — 목록의 80px 자리에 1MB를 걸 이유가 없다", async () => {
  process.env.NCP_SEARCH_KEY_ID = "test-id";
  process.env.NCP_SEARCH_KEY = "test-secret";
  const { restore } = withFetch({ items: [item("양평 구벼울 카페")] });
  try {
    const { searchPlaceImage } = await import("@/lib/api/naverImageSearch");
    const image = await searchPlaceImage("구벼울");
    assert.equal(image?.thumbnail, "https://search.pstatic.net/common/?type=b150&src=full.jpg");
  } finally {
    restore();
  }
});

test("https가 아닌 사진은 쓰지 않는다 — 우리 페이지가 https다", async () => {
  process.env.NCP_SEARCH_KEY_ID = "test-id";
  process.env.NCP_SEARCH_KEY = "test-secret";
  const { restore } = withFetch({
    items: [item("양평 구벼울 카페", { thumbnail: "http://search.pstatic.net/common/?src=full.jpg" })],
  });
  try {
    const { searchPlaceImage } = await import("@/lib/api/naverImageSearch");
    assert.equal(await searchPlaceImage("구벼울"), null);
  } finally {
    restore();
  }
});

test("이름이 적힌 사진이 없으면 null — 화면은 평안이 그림으로 둔다", async () => {
  process.env.NCP_SEARCH_KEY_ID = "test-id";
  process.env.NCP_SEARCH_KEY = "test-secret";
  const { restore } = withFetch({ items: [item("양평 어딘가의 풍경")] });
  try {
    const { searchPlaceImage } = await import("@/lib/api/naverImageSearch");
    assert.equal(await searchPlaceImage("구벼울"), null);
  } finally {
    restore();
  }
});

test("키가 없으면 호출조차 하지 않는다", async () => {
  delete process.env.NCP_SEARCH_KEY_ID;
  delete process.env.NCP_SEARCH_KEY;
  const { calls, restore } = withFetch({ items: [] });
  try {
    const { searchPlaceImage } = await import("@/lib/api/naverImageSearch");
    assert.equal(await searchPlaceImage("구벼울"), null);
    assert.equal(calls.length, 0);
  } finally {
    restore();
  }
});
