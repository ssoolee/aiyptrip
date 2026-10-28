import type { Place } from "@/types/travel";

// 외부 목록(큐레이션 자료, 반려동물 동반 업소 현황)의 장소 이름을 검색 결과와 맞춰 보는
// 빌드 스크립트 공용 유틸.

export function normalizeName(name: string): string {
  return name.replace(/[\s·:()]+/g, "").toLowerCase();
}

// 검색 후보 중 찾는 이름(표시 이름 또는 검색어)과 같은 곳을 고른다. 정확히 같은 이름을
// 먼저 찾고, 없으면 "블룸비스타" ↔ "블룸비스타호텔앤컨퍼런스"처럼 한쪽이 다른 쪽을
// 포함하는 이름을 쓴다 (포함만 보면 "패러글라이딩" 검색에서 다른 업체가 먼저 걸린다).
// 검색 1위가 이름이 다른 업체인 경우가 실제로 있어 이름이 안 맞으면 null.
export function pickByName(candidates: Place[], names: string[]): Place | null {
  const targets = names.map(normalizeName);
  const exact = candidates.find((p) => targets.includes(normalizeName(p.name)));
  if (exact) return exact;
  return (
    candidates.find((p) => {
      const candidate = normalizeName(p.name);
      return targets.some((t) => candidate.includes(t) || t.includes(candidate));
    }) ?? null
  );
}
