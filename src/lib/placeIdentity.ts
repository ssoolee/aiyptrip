import { distanceKm } from "@/lib/geo";
import { Place } from "@/types/travel";

// 같은 업체인지 판정한다. 장소는 네이버 지역 검색(좌표로 만든 ID)과 TourAPI(contentid)
// 두 출처에서 오고, 같은 업체에 서로 다른 ID가 붙는다 — 이름으로 맞춰 보지 않으면
// 한 코스에 같은 가게가 두 번 들어간다.
//
// 실제로 스냅샷에 들어와 있던 예: "쏭바베큐 양평본점"(naver) / "쏭바베큐"(tour).
// 좌표는 20m 차이인데 이름이 완전히 같지 않아 빌드 스크립트의 병합(이름 완전 일치)을
// 빠져나갔다.

/** 이름 비교용 정규화 — 공백·가운뎃점·괄호를 떼고 소문자로. */
export function normalizePlaceName(name: string): string {
  return name.replace(/[\s·:()]+/g, "").toLowerCase();
}

// 지점 이름 꼬리("본점", "양평점", "직영점"…). 떼고 남는 이름이 2자 이상일 때만 뗀다.
const BRANCH_SUFFIX = /(본점|직영점|지점|[가-힣]{1,6}점)$/;

// 같은 업체로 볼 좌표 거리. 이름 포함만 보면 다른 업체를 합칠 수 있어
// ("양평해장국" ⊂ "본가양평해장국 양평지점") 좌표 조건을 함께 둔다.
const SAME_PLACE_KM = 0.05;

interface Identity {
  place: Place;
  name: string;
  // 지점 꼬리를 뗀 이름. 떼고 남는 게 너무 짧으면 원래 이름.
  base: string;
}

function identify(place: Place): Identity {
  const name = normalizePlaceName(place.name);
  const stripped = name.replace(BRANCH_SUFFIX, "");
  return { place, name, base: stripped.length >= 2 ? stripped : name };
}

function isSameIdentity(a: Identity, b: Identity): boolean {
  if (a.name === b.name) return true;
  if (a.base.length < 2 || b.base.length < 2) return false;
  if (!a.base.includes(b.base) && !b.base.includes(a.base)) return false;
  return distanceKm(a.place, b.place) <= SAME_PLACE_KM;
}

/**
 * 두 장소가 같은 업체인가. 정규화 이름이 같거나, 지점 꼬리를 뗀 이름이 한쪽을
 * 포함하면서 좌표가 50m 안쪽이면 같은 곳으로 본다.
 */
export function isSamePlace(a: Place, b: Place): boolean {
  return isSameIdentity(identify(a), identify(b));
}

/**
 * 같은 업체가 여러 번 있으면 앞선(먼저 담긴 = 더 인기 있는) 항목만 남긴다.
 * 버리는 쪽이 들고 있던 값은 남는 쪽의 빈 자리에 채운다 — 출처마다 가진 정보가
 * 달라서(네이버는 영업시간, TourAPI는 사진·소개글) 그냥 버리면 태그 점수가 낮아진다.
 */
export function dedupePlaces(places: Place[]): Place[] {
  // 스냅샷 전체(200곳 가까이)를 서로 비교하므로 이름 정규화는 한 번만 한다.
  const kept: Identity[] = [];
  for (const place of places) {
    const identity = identify(place);
    const duplicate = kept.find((other) => isSameIdentity(other, identity));
    if (duplicate) {
      duplicate.place = merge(duplicate.place, place);
      continue;
    }
    kept.push(identity);
  }
  return kept.map((identity) => identity.place);
}

/** 남는 장소(kept)의 빈 자리를 버리는 쪽(other)의 값으로 채운다. 이름·ID·좌표는 그대로. */
function merge(kept: Place, other: Place): Place {
  return {
    ...kept,
    tags: kept.tags.length > 0 ? kept.tags : other.tags,
    photos: kept.photos.length > 0 ? kept.photos : other.photos,
    categoryLabel: kept.categoryLabel ?? other.categoryLabel,
    phone: kept.phone ?? other.phone,
    rating: kept.rating ?? other.rating,
    businessHoursRaw: kept.businessHoursRaw ?? other.businessHoursRaw,
    reviewSummary: kept.reviewSummary ?? other.reviewSummary,
    // 반려동물 동반은 확인된 곳만 true가 되므로(petPlaces.json) 한쪽이라도 true면 true.
    ...(kept.petFriendly || other.petFriendly ? { petFriendly: true } : {}),
  };
}
