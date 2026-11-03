import type { MetadataRoute } from "next";

// /robots.txt — 수집해도 되는 곳과 아닌 곳.
//
// sitemap.ts와 같은 이유로 [lang] 바깥에 둔다 (크롤러는 뿌리에서 찾는다).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // 사람마다 다르거나(찜) 입력마다 다른(검색) 화면은 수집할 것이 없다.
      // 코스 상세는 생성 코스가 30일 뒤 사라져 죽은 주소가 쌓인다.
      disallow: ["/*/favorites", "/*/course/search", "/*/course/detail/", "/*/login", "/*/profile"],
    },
    sitemap: "https://aiyptrip.web.app/sitemap.xml",
  };
}
