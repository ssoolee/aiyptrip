import { getNcpApiHeaders } from "@/lib/api/ncpMap";
import { stripHtml } from "@/lib/api/naverSearchText";

// docs/prd/03-place-detail-prd.md §7 오픈 이슈 "리뷰 원본 데이터 확보처" 해소책.
//
// 네이버는 플레이스의 방문자 리뷰·별점을 공개 API로 주지 않는다. 지역 검색 응답은
// title, link, category, description, telephone, address, roadAddress, mapx, mapy
// 뿐이고(공식 문서 naver-api-hub-search-local, 2026-10 실측 일치) 평점·리뷰 수
// 필드가 없다. sort=comment로 "블로그·카페 리뷰가 많은 순" 정렬만 가능하고 그 개수는
// 응답에 담기지 않는다. 그래서 공식 API로 받을 수 있는 블로그 리뷰를 대신 쓴다.
// https://api.ncloud-docs.com/docs/naver-api-hub-search-blog
const BLOG_SEARCH_URL = "https://naverapihub.apigw.ntruss.com/search/v1/blog";

// 지역 검색과 같은 NAVER API HUB 애플리케이션 키를 쓰지만, 콘솔에서 '블로그 검색'을
// 따로 활성화해야 한다 — 안 되어 있으면 401 {"errorCode":401,"message":"요청한 API는
// 이 Application에서 활성화되어 있지 않습니다."}가 온다. 그때는 리뷰 영역을 아예
// 보여주지 않는다(null 반환). README "네이버 블로그 리뷰" 참조.
export interface BlogReview {
  title: string;
  link: string;
  blogger: string;
  /** "2026.10.27" — 응답은 YYYYMMDD 문자열로 온다. 형식이 다르면 빈 문자열. */
  date: string;
  excerpt: string;
}

export interface PlaceReviews {
  /** 검색된 블로그 글 전체 수. 리뷰 "건수"로 보여준다. */
  total: number;
  reviews: BlogReview[];
  /** 네이버 블로그 검색 전체 결과로 나가는 링크 */
  searchUrl: string;
}

interface NaverBlogItem {
  title?: string;
  link?: string;
  description?: string;
  bloggername?: string;
  postdate?: string;
}

export function formatPostDate(postdate: string | undefined): string {
  if (!postdate || !/^\d{8}$/.test(postdate)) return "";
  return `${postdate.slice(0, 4)}.${postdate.slice(4, 6)}.${postdate.slice(6, 8)}`;
}

// "양평"을 붙이는 건 전국의 같은 이름을 걸러내기 위해서고(지역 검색도 같은 방식),
// "후기"를 붙이는 건 방문기가 아닌 글을 밀어내기 위해서다. 실측 비교(2026-10):
// "양평 두물머리"의 상위 3건에는 살인사건 기사가 들어 있었는데 "양평 두물머리
// 후기"로는 10건 모두 방문기였다. 지역명 없이 "{이름} 방문 후기"로 하면 광주·부산
// 같은 다른 지역 글이 섞인다.
export function reviewQuery(placeName: string): string {
  return `양평 ${placeName.trim()} 후기`.slice(0, 80);
}

// 보여줄 수보다 넉넉히 받아 거른 뒤 앞에서 자른다.
const CANDIDATE_COUNT = 10;

// 여행 코스 옆에 둘 수 없는 글. "후기"를 붙인 뒤로는 상위에 올라오지 않지만,
// 한 번 새면 관광지 소개 옆에 사건 기사가 붙으므로 그물을 하나 더 둔다.
const BLOCKED_WORDS = /살인|사건|부검|실종|검거|폭행|사망|화재|압수|구속|피의자|성범죄|마약/;

// 띄어쓰기를 지워 비교한다 — 블로그 제목은 "하우스베이커리"처럼 붙여 쓰는 일이 잦다.
const squash = (text: string) => text.replace(/\s+/g, "");

export function blogSearchUrl(placeName: string): string {
  return `https://search.naver.com/search.naver?ssc=tab.blog.all&query=${encodeURIComponent(reviewQuery(placeName))}`;
}

export function toReviews(items: NaverBlogItem[], count: number, placeName = ""): BlogReview[] {
  const needle = squash(placeName);
  return items
    .filter((item) => item.title && item.link)
    .filter((item) => {
      const text = `${item.title ?? ""} ${item.description ?? ""}`;
      // 검색어가 장소를 가리켰다고 해서 글이 그 장소 얘기라는 보장은 없다 —
      // 이름을 한 번도 적지 않은 글은 뺀다(띄어쓰기는 무시: "하우스베이커리").
      if (needle && !squash(text).includes(needle)) return false;
      return !BLOCKED_WORDS.test(text);
    })
    .slice(0, count)
    .map((item) => ({
      title: stripHtml(item.title ?? ""),
      link: item.link ?? "",
      blogger: stripHtml(item.bloggername ?? ""),
      date: formatPostDate(item.postdate),
      excerpt: stripHtml(item.description ?? ""),
    }));
}

/**
 * 장소 이름으로 네이버 블로그 리뷰를 찾는다. 키가 없거나 블로그 검색이 활성화되지
 * 않았거나 결과가 없으면 null — 호출부는 리뷰 영역을 그리지 않는다.
 */
export async function searchBlogReviews(
  placeName: string,
  options: { count?: number } = {},
): Promise<PlaceReviews | null> {
  const { count = 3 } = options;
  const headers = getNcpApiHeaders();
  if (!headers || !placeName.trim()) return null;

  const query = reviewQuery(placeName);
  try {
    const qs = new URLSearchParams({ query, display: String(CANDIDATE_COUNT), sort: "sim" });
    const res = await fetch(`${BLOG_SEARCH_URL}?${qs.toString()}`, {
      headers,
      // 블로그 글은 자주 늘지 않고, 같은 장소를 여러 번 열어도 호출을 아끼려고
      // 지역 검색·TourAPI와 같은 6시간 캐시를 쓴다 (하루 한도 25,000회).
      next: { revalidate: 60 * 60 * 6 },
    });
    if (!res.ok) {
      console.warn(`[naver] blog search HTTP ${res.status} (${query})`);
      return null;
    }
    const data = await res.json();
    const reviews = toReviews(Array.isArray(data?.items) ? data.items : [], count, placeName);
    if (reviews.length === 0) return null;
    return {
      total: typeof data?.total === "number" ? data.total : reviews.length,
      reviews,
      searchUrl: blogSearchUrl(placeName),
    };
  } catch {
    return null;
  }
}
