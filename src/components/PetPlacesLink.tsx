import Link from "next/link";

// 홈과 "반려동물과 함께" 코스 화면에서 반려동물 동반 업소 지도(/pet-places)로 가는 버튼.
export default function PetPlacesLink() {
  return (
    <Link
      href="/pet-places"
      className="flex min-h-12 items-center justify-between gap-2 rounded-[var(--radius-card)] border border-[var(--color-primary)] bg-[var(--color-primary)]/5 px-4 py-3 text-sm font-semibold text-[var(--color-primary)]"
    >
      <span>🐾 반려동물 동반 업소 한눈에 보기</span>
      <span aria-hidden>→</span>
    </Link>
  );
}
