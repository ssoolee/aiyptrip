import { test } from "node:test";
import assert from "node:assert/strict";
import { blogSearchUrl, formatPostDate, reviewQuery, toReviews } from "@/lib/api/naverBlogSearch";

test("postdate(YYYYMMDD)를 읽기 좋은 날짜로 바꾼다", () => {
  assert.equal(formatPostDate("20261027"), "2026.10.27");
});

test("날짜 형식이 아니면 빈 문자열 — 화면에서 빠진다", () => {
  assert.equal(formatPostDate(undefined), "");
  assert.equal(formatPostDate(""), "");
  assert.equal(formatPostDate("2026-10-27"), "");
});

test("검색어에 지역명과 '후기'를 붙인다 — 다른 지역·방문기 아닌 글을 밀어낸다", () => {
  assert.equal(reviewQuery("테라로사"), "양평 테라로사 후기");
  assert.equal(reviewQuery("  두물머리  "), "양평 두물머리 후기");
});

test("검색 링크는 블로그 탭으로 열고 검색어를 인코딩한다", () => {
  const url = blogSearchUrl("테라로사");
  assert.ok(url.startsWith("https://search.naver.com/search.naver?ssc=tab.blog.all&query="));
  assert.ok(url.endsWith(encodeURIComponent("양평 테라로사 후기")));
});

test("<b> 강조와 HTML 엔티티를 벗겨 낸다", () => {
  const [review] = toReviews(
    [
      {
        title: "<b>양평</b> 테라로사 다녀왔어요 &amp; 추천",
        link: "https://blog.naver.com/a/1",
        description: "커피가 <b>진짜</b> 맛있는 곳 &#39;강추&#39;",
        bloggername: "여행자의 <b>기록</b>",
        postdate: "20261027",
      },
    ],
    3,
  );
  assert.equal(review.title, "양평 테라로사 다녀왔어요 & 추천");
  assert.equal(review.excerpt, "커피가 진짜 맛있는 곳 '강추'");
  assert.equal(review.blogger, "여행자의 기록");
  assert.equal(review.date, "2026.10.27");
});

test("제목이나 링크가 없는 항목은 버리고, 요청한 개수까지만 남긴다", () => {
  const items = [
    { title: "글1", link: "https://blog.naver.com/a/1" },
    { title: "제목만 있고 링크 없음" },
    { link: "https://blog.naver.com/a/3" },
    { title: "글2", link: "https://blog.naver.com/a/4" },
    { title: "글3", link: "https://blog.naver.com/a/5" },
  ];
  const reviews = toReviews(items, 2);
  assert.equal(reviews.length, 2);
  assert.deepEqual(
    reviews.map((r) => r.title),
    ["글1", "글2"],
  );
});

test("설명·블로그명·날짜가 없어도 빈 문자열로 채운다", () => {
  const [review] = toReviews([{ title: "글", link: "https://blog.naver.com/a/1" }], 3);
  assert.equal(review.excerpt, "");
  assert.equal(review.blogger, "");
  assert.equal(review.date, "");
});

// 아래는 네트워크를 타지 않고 fetch만 바꿔 끼워 호출부 전체를 확인한다.
// 실제 키로는 블로그 검색이 활성화되기 전까지 401이 오므로(README 참조),
// 성공 응답과 401을 모두 여기서 재현해 둔다.
function withFetch(handler: (url: string) => { status: number; body: unknown }) {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const { status, body } = handler(String(input));
    return new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
  return () => {
    globalThis.fetch = original;
  };
}

test("성공 응답을 리뷰 목록으로 조립한다", async () => {
  process.env.NCP_MAP_CLIENT_ID = "test-id";
  process.env.NCP_MAP_CLIENT_SECRET = "test-secret";
  let requested = "";
  const restore = withFetch((url) => {
    requested = url;
    return {
      status: 200,
      body: {
        lastBuildDate: "Mon, 27 Oct 2026 10:00:00 +0900",
        total: 1234,
        start: 1,
        display: 3,
        items: [
          {
            title: "<b>양평</b> 두물머리 카페",
            link: "https://blog.naver.com/a/1",
            description: "연꽃이 예뻐요",
            bloggername: "양평사람",
            postdate: "20261020",
          },
        ],
      },
    };
  });
  try {
    const { searchBlogReviews } = await import("@/lib/api/naverBlogSearch");
    const result = await searchBlogReviews("두물머리 카페");
    assert.ok(result);
    assert.equal(result.total, 1234);
    assert.equal(result.reviews.length, 1);
    assert.equal(result.reviews[0].title, "양평 두물머리 카페");
    assert.equal(result.reviews[0].date, "2026.10.20");
    assert.ok(requested.includes("/search/v1/blog?"));
    // URLSearchParams는 공백을 "+"로 적는다 — 쿼리 문자열에서 유효한 공백 표현이다.
    const sent = new URL(requested).searchParams;
    assert.equal(sent.get("query"), "양평 두물머리 카페 후기");
    // 걸러낼 것을 감안해 보여줄 3건보다 넉넉히 받는다.
    assert.equal(sent.get("display"), "10");
    assert.equal(sent.get("sort"), "sim");
  } finally {
    restore();
  }
});

test("블로그 검색이 활성화되지 않은 401이면 null — 화면에서 영역을 접는다", async () => {
  process.env.NCP_MAP_CLIENT_ID = "test-id";
  process.env.NCP_MAP_CLIENT_SECRET = "test-secret";
  const restore = withFetch(() => ({
    status: 401,
    body: { error: { errorCode: 401, message: "요청한 API는 이 Application에서 활성화되어 있지 않습니다." } },
  }));
  try {
    const { searchBlogReviews } = await import("@/lib/api/naverBlogSearch");
    assert.equal(await searchBlogReviews("두물머리 카페"), null);
  } finally {
    restore();
  }
});

test("결과가 없으면 null — 0건 제목을 띄우지 않는다", async () => {
  process.env.NCP_MAP_CLIENT_ID = "test-id";
  process.env.NCP_MAP_CLIENT_SECRET = "test-secret";
  const restore = withFetch(() => ({ status: 200, body: { total: 0, items: [] } }));
  try {
    const { searchBlogReviews } = await import("@/lib/api/naverBlogSearch");
    assert.equal(await searchBlogReviews("있을 수 없는 이름"), null);
  } finally {
    restore();
  }
});

test("키가 없으면 호출조차 하지 않는다", async () => {
  delete process.env.NCP_MAP_CLIENT_ID;
  delete process.env.NCP_MAP_CLIENT_SECRET;
  let called = false;
  const restore = withFetch(() => {
    called = true;
    return { status: 200, body: {} };
  });
  try {
    const { searchBlogReviews } = await import("@/lib/api/naverBlogSearch");
    assert.equal(await searchBlogReviews("두물머리"), null);
    assert.equal(called, false);
  } finally {
    restore();
  }
});

test("장소 이름을 한 번도 적지 않은 글은 버린다 — 띄어쓰기는 무시", () => {
  const items = [
    { title: "양평 <b>하우스베이커리</b> 다녀왔어요", link: "https://blog.naver.com/a/1", description: "" },
    { title: "경기도 산", link: "https://blog.naver.com/a/2", description: "등산 기록입니다" },
    { title: "양평 나들이", link: "https://blog.naver.com/a/3", description: "하우스 베이커리에서 빵을 샀다" },
  ];
  const reviews = toReviews(items, 3, "하우스 베이커리");
  assert.deepEqual(
    reviews.map((r) => r.link),
    ["https://blog.naver.com/a/1", "https://blog.naver.com/a/3"],
  );
});

test("사건·사고 글은 이름이 맞아도 버린다 — 여행 코스 옆에 둘 수 없다", () => {
  const items = [
    { title: "양평 두물머리 살인사건, 사건의 전말", link: "https://blog.naver.com/a/1", description: "두물머리" },
    { title: "양평 두물머리 연핫도그 후기", link: "https://blog.naver.com/a/2", description: "두물머리 맛집" },
  ];
  const reviews = toReviews(items, 3, "두물머리");
  assert.equal(reviews.length, 1);
  assert.equal(reviews[0].title, "양평 두물머리 연핫도그 후기");
});

test("장소 이름을 넘기지 않으면 이름 검사는 건너뛴다", () => {
  const reviews = toReviews([{ title: "아무 글", link: "https://blog.naver.com/a/1" }], 3);
  assert.equal(reviews.length, 1);
});
