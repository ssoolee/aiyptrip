import Link from "next/link";

// 홈과 "반려동물과 함께" 코스 화면에서 반려동물 동반 업소 지도(/pet-places)로 가는 버튼.
// 포털의 '지역 관광' 색(--color-accent)을 써서 코스 카드의 초록과 구분된다.
export default function PetPlacesLink() {
  return (
    <Link
      href="/pet-places"
      className="flex min-h-12 items-center justify-between gap-2 rounded-[var(--radius-card)] border border-[var(--color-accent)] bg-[var(--color-accent)]/10 px-4 py-3 text-sm font-semibold text-[var(--color-accent)]"
    >
      <span>🐾 반려동물 동반 업소 한눈에 보기</span>
      <span aria-hidden>→</span>
    </Link>
  );
}
