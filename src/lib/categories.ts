import { Category } from "@/types/travel";

export const CATEGORY_LABEL: Record<Category, string> = {
  restaurant: "식당",
  cafe: "카페",
  attraction: "관광지",
  lodging: "숙소",
};

// 사진이 없는 장소의 플레이스홀더 (PRD-03 §4 — 빈 화면처럼 보이지 않게 한다).
export const CATEGORY_EMOJI: Record<Category, string> = {
  restaurant: "🍚",
  cafe: "☕",
  attraction: "🏞",
  lodging: "🏡",
};
