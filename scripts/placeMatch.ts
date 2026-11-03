import { normalizePlaceName } from "@/lib/placeIdentity";
import type { Place } from "@/types/travel";

// 외부 목록(큐레이션 자료, 반려동물 동반 업소 현황)의 장소 이름을 검색 결과와 맞춰 보는
// 빌드 스크립트 공용 유틸.

// 이름 정규화 규칙은 앱과 같은 것을 쓴다 — 빌드 때 합친 장소를 화면에서 다시
// 다른 곳으로 보면 중복이 생긴다.
export const normalizeName = normalizePlaceName;

// 검색 후보 중 찾는 이름(표시 이름 또는 검색어)과 같은 곳을 고른다. 정확히 같은 이름을
// 먼저 찾고, 없으면 "블룸비스타" ↔ "블룸비스타호텔앤컨퍼런스"처럼 한쪽이 다른 쪽을
// 포함하는 이름을 쓴다 (포함만 보면 "패러글라이딩" 검색에서 다른 업체가 먼저 걸린다).
// 검색 1위가 이름이 다른 업체인 경우가 실제로 있어 이름이 안 맞으면 null.
//
// 포함으로 걸리는 후보가 여럿이면 **이름이 가장 짧은** 것을 고른다. 먼저 나온 것을
// 쓰면 "두물머리"가 같은 목록에 있는 "양평 두물머리"를 두고 "두물머리생태학교"에
// 붙는다 — 실제로 그 바람에 생태학교의 "예약 필수" 영업시간이 두물머리에 들어갔다.
export function pickByName(candidates: Place[], names: string[]): Place | null {
  const targets = names.map(normalizeName);
  const exact = candidates.find((p) => targets.includes(normalizeName(p.name)));
  if (exact) return exact;

  const contained = candidates.filter((p) => {
    const candidate = normalizeName(p.name);
    return targets.some((t) => candidate.includes(t) || t.includes(candidate));
  });
  if (contained.length === 0) return null;
  return contained.reduce((best, p) =>
    normalizeName(p.name).length < normalizeName(best.name).length ? p : best,
  );
}

/** 도로명 주소의 건물번호("용문산로 120-11 1층" → "120-11"). 없으면 null. */
function buildingNumber(address: string | undefined): string | null {
  const matched = /(?:로|길)\s*(\d+(?:-\d+)?)/.exec(address ?? "");
  return matched ? matched[1] : null;
}

/**
 * 두 주소가 서로 다른 건물을 가리키는지 본다.
 *
 * 이름이 비슷한 옆 가게를 같은 곳으로 보는 것을 막는다 — "광이원"(용문산로 120-11)과
 * "광이원 보배밥"(120-13)은 10m 거리의 다른 업체인데, 이름 포함과 거리(0.01km)만으로는
 * 가려낼 수 없었다. 한쪽이라도 건물번호가 없으면(예: "양평군 양서면 양수리") 판단하지
 * 않는다 — 모르는 것을 틀렸다고 하면 맞는 짝까지 버린다.
 */
export function conflictingAddress(a: string | undefined, b: string | undefined): boolean {
  const left = buildingNumber(a);
  const right = buildingNumber(b);
  if (!left || !right) return false;
  return left !== right;
}
