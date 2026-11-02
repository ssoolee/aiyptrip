import { getNcpApiHeaders } from "@/lib/api/ncpMap";
import { stripHtml } from "@/lib/api/naverSearchText";

// 네이버 이미지 검색 — 장소 사진을 구하는 마지막 수단.
// https://api.ncloud-docs.com/docs/naver-api-hub-search-image
//
// 지역 검색은 사진을 주지 않고(naverSearch.ts 머리말), TourAPI는 네이버에만 있는
// 가게를 아예 모른다 — 홈에 올리는 열두 곳으로 실측했을 때 TourAPI가 보탠 사진은
// 0건이었다. 그래서 이미지 검색에서 받아 온다.
//
// 쓰는 값은 원본(link)이 아니라 thumbnail이다. 원본은 1080px에 0.5~1.3MB짜리가
// 흔해서 80px 자리에 쓰면 홈이 무거워진다. thumbnail은 네이버가 만들어 둔
// search.pstatic.net의 150px 이미지로 7KB 안팎이고 https다.
const IMAGE_SEARCH_URL = "https://naverapihub.apigw.ntruss.com/search/v1/image";

// 이름이 맞는 사진을 고르려면 넉넉히 받아 걸러야 한다 — 검색 결과에는 이름과
// 무관한 사진이 섞인다(실측: "양평 흑유재" 2위가 신발 사진).
const CANDIDATE_COUNT = 10;

interface NaverImageItem {
  title?: string;
  link?: string;
  thumbnail?: string;
  sizewidth?: string;
  sizeheight?: string;
}

const squash = (text: string) => text.replace(/\s+/g, "").toLowerCase();

export interface PlaceImage {
  /** 목록에 거는 작은 사진 (search.pstatic.net, 150px 안팎 · 7KB). */
  thumbnail: string;
  /** 카드 커버·상세 시트에 거는 중간 크기 (340px 안팎 · 47KB). */
  medium: string;
  /** 원본 사진 주소 — 1080px에 0.5~1.3MB가 흔해 화면에는 쓰지 않는다. */
  link: string;
  /** 사진이 걸린 글의 제목. 무엇을 보고 고른 사진인지 남긴다. */
  title: string;
}

// 네이버 썸네일 주소는 type 파라미터로 크기를 고른다. b150(150px)과 a340(340px)만
// 쓴다 — w466·f400_400 같은 값은 404다(2026-11 실측).
function withThumbnailType(url: string, type: "b150" | "a340"): string {
  return url.includes("type=b150") ? url.replace("type=b150", `type=${type}`) : url;
}

/**
 * 장소 이름으로 사진 한 장을 찾는다. 키가 없거나 이름이 적힌 사진이 없으면 null —
 * 호출부는 사진 없이 두면 된다(화면은 평안이 그림으로 대신한다).
 *
 * 사진 제목에 장소 이름이 적힌 것만 고른다. 블로그 글을 셀 때와 같은 잣대다
 * (naverBlogSearch.ts의 isTitledAfterPlace) — 검색어가 그 장소를 가리켰다고 해서
 * 결과가 그 장소 사진이라는 보장은 없다.
 */
export async function searchPlaceImage(placeName: string): Promise<PlaceImage | null> {
  const headers = getNcpApiHeaders();
  if (!headers || !placeName.trim()) return null;

  const needle = squash(placeName);
  // 지역명을 붙여 전국의 같은 이름을 밀어낸다 (지역 검색·블로그 검색과 같은 방식).
  const query = `양평 ${placeName.trim()}`.slice(0, 80);

  try {
    const qs = new URLSearchParams({ query, display: String(CANDIDATE_COUNT), sort: "sim" });
    const res = await fetch(`${IMAGE_SEARCH_URL}?${qs.toString()}`, {
      headers,
      // 가게 사진은 자주 바뀌지 않는다 — 지역 검색·블로그 검색과 같은 6시간 캐시.
      next: { revalidate: 60 * 60 * 6 },
    });
    if (!res.ok) {
      // 콘솔에서 '이미지 검색'을 활성화하지 않으면 401이 온다 (블로그 검색과 같다).
      console.warn(`[naver] image search HTTP ${res.status} (${query})`);
      return null;
    }
    const data = await res.json();
    const items: NaverImageItem[] = Array.isArray(data?.items) ? data.items : [];

    for (const item of items) {
      const title = stripHtml(item.title ?? "");
      if (needle && !squash(title).includes(needle)) continue;
      // https가 아닌 주소는 쓰지 않는다 — 우리 페이지가 https라 브라우저가 막는다.
      const thumbnail = item.thumbnail ?? "";
      const link = item.link ?? "";
      if (!thumbnail.startsWith("https://")) continue;
      return {
        thumbnail: withThumbnailType(thumbnail, "b150"),
        medium: withThumbnailType(thumbnail, "a340"),
        link: link.startsWith("https://") ? link : thumbnail,
        title,
      };
    }
    return null;
  } catch {
    return null;
  }
}
