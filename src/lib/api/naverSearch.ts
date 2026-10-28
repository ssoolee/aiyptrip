import { Category, Place } from "@/types/travel";
import { getNcpApiHeaders } from "@/lib/api/ncpMap";
import { stripHtml } from "@/lib/api/naverSearchText";

// docs/prd/07-external-api-integration.md "장소 검색", docs/agents/02-place-retrieval-agent.md 참조.
// 네이버 지역 검색 — 개발자센터가 2026-07-31부로 신규 발급을 종료해 NCP의
// NAVER API HUB로 이관된 버전을 쓴다. 인증은 API HUB를 구독한 NCP 애플리케이션 키
// (NCP_MAP_CLIENT_ID/SECRET → X-NCP-APIGW-API-KEY-ID/KEY 헤더, src/lib/api/ncpMap.ts).
// https://api.ncloud-docs.com/docs/naver-api-hub-search-local
const LOCAL_SEARCH_URL = "https://naverapihub.apigw.ntruss.com/search/v1/local";

// 한 번에 최대 5건만 반환되므로 양평군 12개 읍·면으로 나눠 검색해 후보 풀을 넓힌다.
const AREAS = [
  "양평읍", "강상면", "강하면", "양서면", "옥천면", "서종면",
  "단월면", "청운면", "양동면", "지평면", "용문면", "개군면",
];

const QUERY_KEYWORD: Partial<Record<Category, string>> = {
  cafe: "카페",
  restaurant: "맛집",
};

// 응답에 평점·리뷰 수·리뷰 내용 필드는 없다 (공식 문서 + 2026-10 실측). 플레이스
// 리뷰는 src/lib/api/naverBlogSearch.ts의 블로그 검색으로 대신한다.
// link는 업체 홈페이지 주소로, 대부분 빈 문자열이고 네이버 플레이스 주소가 아니다
// (실측: "스타벅스 더양평DT점" → starbucks.co.kr, 개인 업체 → ""). description도 빈 값.
interface NaverLocalItem {
  title: string;
  category?: string;
  telephone?: string;
  address?: string;
  roadAddress?: string;
  mapx?: string;
  mapy?: string;
}

async function searchLocal(query: string): Promise<NaverLocalItem[]> {
  const headers = getNcpApiHeaders();
  if (!headers) return [];

  try {
    const qs = new URLSearchParams({ query, display: "5", sort: "comment" });
    const res = await fetch(`${LOCAL_SEARCH_URL}?${qs.toString()}`, {
      headers,
      // 업체 목록은 자주 바뀌지 않고 호출량을 아끼기 위해 TourAPI와 같이 6시간 캐시.
      next: { revalidate: 60 * 60 * 6 },
    });
    if (!res.ok) {
      console.warn(`[naver] local search HTTP ${res.status}`);
      return [];
    }
    const data = await res.json();
    return Array.isArray(data?.items) ? data.items : [];
  } catch {
    return [];
  }
}

// 네이버 업종 문자열(예: "음식점>카페,디저트", "한식>칼국수,만두")로 카테고리 판별.
// 맛집 검색에도 식물원 같은 비음식점이 섞여 나오므로(2026-09 실측) 그런 업종은 null.
function categoryOf(item: NaverLocalItem): Category | null {
  const category = item.category ?? "";
  if (/식물원|수목원|공원|관광|숙박|펜션|정육|포장/.test(category)) return null;
  return /카페|디저트|베이커리/.test(category) ? "cafe" : "restaurant";
}

// 여행 코스로 추천할 가치가 낮은 결과: 고속도로 휴게소 매장, 전국 어디에나 있는
// 프랜차이즈 베이커리·패스트푸드·저가 커피, 회 포장 전문점 등. 실측 결과 읍·면
// 검색마다 휴게소 매장이 상위에 섞여 나와 후보를 오염시켰다.
const EXCLUDED_NAME =
  /휴게소|휴계소|파리바게뜨|뚜레쥬르|던킨|탐앤탐스|파스쿠찌|이디야|메가.?커피|컴포즈|빽다방|bhc|bbq|교촌|맘스터치|롯데리아|맥도날드|버거킹|호두과자|회포장/i;

function toPlace(item: NaverLocalItem, category: Category): Place | null {
  // 좌표는 WGS84 × 10^7 정수 문자열 (예: "1273172732" → 127.3172732).
  const lng = Number(item.mapx) / 1e7;
  const lat = Number(item.mapy) / 1e7;
  const name = stripHtml(item.title ?? "");
  const address = item.roadAddress || item.address || "";
  if (!name || !lat || !lng || Number.isNaN(lat) || Number.isNaN(lng)) return null;

  return {
    // 네이버 지역 검색은 고유 ID를 주지 않아 좌표로 식별한다 (같은 업체 = 같은 좌표).
    placeId: `naver_${item.mapx}_${item.mapy}`,
    name,
    category,
    categoryLabel: item.category || undefined,
    lat,
    lng,
    address,
    // 이관된 API는 전화번호를 빈 문자열로 준다 (2026-09 실측) — 있으면 사용.
    phone: item.telephone || undefined,
    photos: [],
    mapUrl: `https://map.naver.com/p/search/${encodeURIComponent(`${name} ${address}`)}`,
    tags: [],
  };
}

// 음식점/카페 후보를 읍·면별 검색 결과로 모은다. 양평군 밖 업체는 제외하고,
// 요청한 카테고리와 업종이 다른 결과(맛집 검색에 섞여 나온 카페 등)도 거른다.
export async function searchNaverPlaces(category: Category): Promise<Place[]> {
  const keyword = QUERY_KEYWORD[category];
  if (!keyword) return [];

  const results = await Promise.all(AREAS.map((area) => searchLocal(`양평 ${area} ${keyword}`)));
  // 읍·면별 1위, 2위… 순으로 번갈아 담아 앞쪽 후보가 한 지역에 몰리지 않게 한다.
  const interleaved = Array.from({ length: 5 }, (_, rank) => results.map((items) => items[rank])).flat();
  const places = new Map<string, Place>();
  for (const item of interleaved) {
    if (!item) continue;
    if (categoryOf(item) !== category || EXCLUDED_NAME.test(stripHtml(item.title ?? ""))) continue;
    if (!`${item.roadAddress} ${item.address}`.includes("양평군")) continue;
    const place = toPlace(item, category);
    if (place && !places.has(place.placeId)) places.set(place.placeId, place);
  }
  return [...places.values()];
}

// 큐레이션 코스(scripts/build-mbti-courses.ts)의 장소 이름으로 양평군 업체 후보를 찾는다.
// 카테고리는 원천 자료를 따르므로 업종 판별은 하지 않는다. 이름이 다른 업체가 섞여
// 나오므로(실측: "두물머리" 검색 1위가 다른 카페) 어느 후보를 쓸지는 호출부가 이름으로 고른다.
export async function searchNaverPlacesByKeyword(query: string, category: Category): Promise<Place[]> {
  const items = await searchLocal(`양평 ${query}`);
  return items
    .filter((i) => `${i.roadAddress} ${i.address}`.includes("양평군"))
    .map((i) => toPlace(i, category))
    .filter((p): p is Place => p !== null);
}
