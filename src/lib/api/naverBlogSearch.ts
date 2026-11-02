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

// 검색어가 장소를 가리켰다고 해서 글이 그 장소 얘기라는 보장은 없다 —
// 이름을 한 번도 적지 않은 글은 뺀다(띄어쓰기는 무시: "하우스베이커리").
//
// 비교 전에 태그를 벗긴다 — 네이버는 검색어에 걸린 말을 <b>로 감싸 보내서,
// 날것 그대로 비교하면 "<b>두물머리</b> <b>연핫도그</b>"가 이름과 어긋난다.
function isAboutPlace(item: NaverBlogItem, needle: string): boolean {
  if (!item.title || !item.link) return false;
  const text = stripHtml(`${item.title ?? ""} ${item.description ?? ""}`);
  if (needle && !squash(text).includes(needle)) return false;
  return !BLOCKED_WORDS.test(text);
}

/**
 * 글 **제목**이 이 장소를 가리키는가. 글 수를 셀 때 쓴다.
 *
 * 본문(description)은 검색어 주변을 잘라 만든 조각이라 이름이 거의 언제나 들어 있다.
 * "양평 휴식 후기"로 받은 최신 글 열두 건 중 열한 건이 본문에 "휴식"을 담고 있었지만
 * 식당 '휴식' 이야기는 한 건도 없었다(2026-11 실측). 제목으로 거르면 "두물머리
 * 연핫도그" 같은 곳은 그대로 남고 흔한 낱말 이름만 떨어진다.
 */
function isTitledAfterPlace(item: NaverBlogItem, needle: string): boolean {
  if (!item.title) return false;
  const title = stripHtml(item.title);
  if (needle && !squash(title).includes(needle)) return false;
  return !BLOCKED_WORDS.test(title);
}

export function toReviews(items: NaverBlogItem[], count: number, placeName = ""): BlogReview[] {
  const needle = squash(placeName);
  return items
    .filter((item) => isAboutPlace(item, needle))
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

// ── 최근 글 수 세기 ────────────────────────────────────────────────────────────
//
// "요즘 이야기가 많은 곳"을 뽑으려면 전체 기간 합계(total)가 아니라 최근 몇 주에
// 올라온 글 수가 필요하다. 블로그 검색은 기간 필터를 주지 않으므로(공식 문서에 없고
// 2026-11 실측도 같다) sort=date로 최신순을 받아 postdate가 기간 안인 글만 센다.

/** 한 번에 받을 수 있는 최대 건수 (네이버 검색 API 공통 상한). */
const MAX_DISPLAY = 100;
/** 최신순으로 훑어볼 상한. 이보다 많이 올라오는 곳은 "이상"으로 적는다. */
const SCAN_LIMIT = 300;

export interface RecentBlogPosts {
  /** 기간 안에 올라온 글 수 (제목이 이 장소를 가리키는 글만 — isTitledAfterPlace). */
  count: number;
  /** 훑어본 상한에 걸려 실제로는 더 많을 수 있는지. */
  capped: boolean;
  /** 몇 일을 기준으로 셌는지. */
  days: number;
}

/**
 * 블로그 글 수로 "요즘 뜨는 곳"을 가릴 수 있는 이름인가.
 *
 * 두 글자 이름은 흔한 낱말과 구별되지 않는다. "소풍"(양서면의 카페)은 제목으로 걸러도
 * 30일에 40건이 잡혔는데, 최신 글을 들여다보니 그 카페 이야기는 한 건도 없고 "가을
 * 소풍" 같은 제목이었다. "휴식"·"길조"도 같다(2026-11 실측). 셀 수 없는 것을 0으로도
 * 큰 수로도 적지 않도록, 아예 순위에서 뺀다.
 */
export function canCountRecentPosts(placeName: string): boolean {
  return squash(placeName).length >= 3;
}

/** "20261102" → Date. 형식이 다르면 null. */
export function parsePostDate(postdate: string | undefined): Date | null {
  if (!postdate || !/^\d{8}$/.test(postdate)) return null;
  const [y, m, d] = [postdate.slice(0, 4), postdate.slice(4, 6), postdate.slice(6, 8)].map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * 최근 `days`일 안에 이 장소를 적은 블로그 글이 몇 건 올라왔는지 센다.
 * 키가 없거나 호출이 실패하면 null — 호출부가 그 장소를 순위에서 빼면 된다.
 *
 * 최신순이라 기간을 벗어난 글이 나오면 그 뒤는 볼 필요가 없다. 한 쪽(100건)을 다
 * 쓰고도 기간 안이면 다음 쪽을 받는다.
 */
export async function countRecentBlogPosts(
  placeName: string,
  options: { days?: number } = {},
): Promise<RecentBlogPosts | null> {
  const { days = 30 } = options;
  const headers = getNcpApiHeaders();
  if (!headers || !placeName.trim() || !canCountRecentPosts(placeName)) return null;

  const query = reviewQuery(placeName);
  const needle = squash(placeName);
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  let count = 0;
  let scanned = 0;

  for (let start = 1; start <= SCAN_LIMIT; start += MAX_DISPLAY) {
    const qs = new URLSearchParams({
      query,
      display: String(MAX_DISPLAY),
      start: String(start),
      sort: "date",
    });
    let items: NaverBlogItem[];
    try {
      const res = await fetch(`${BLOG_SEARCH_URL}?${qs.toString()}`, {
        headers,
        // 전체 기간 집계와 같은 6시간 캐시. 최근 글 수는 하루 단위로나 의미가 있다.
        next: { revalidate: 60 * 60 * 6 },
      });
      if (!res.ok) {
        console.warn(`[naver] blog recent HTTP ${res.status} (${query})`);
        return null;
      }
      const data = await res.json();
      items = Array.isArray(data?.items) ? data.items : [];
    } catch {
      return null;
    }
    if (items.length === 0) return { count, capped: false, days };

    let reachedOld = false;
    for (const item of items) {
      scanned += 1;
      const date = parsePostDate(item.postdate);
      // 날짜를 읽을 수 없는 글은 기간 판단을 못 하니 세지 않고 지나간다.
      if (!date) continue;
      if (date.getTime() < cutoff) {
        reachedOld = true;
        break;
      }
      if (isTitledAfterPlace(item, needle)) count += 1;
    }
    if (reachedOld || items.length < MAX_DISPLAY) return { count, capped: false, days };
  }

  return { count, capped: scanned >= SCAN_LIMIT, days };
}
