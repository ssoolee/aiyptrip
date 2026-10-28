"use client";

import { useSyncExternalStore } from "react";
import {
  getFavoritePlacesServerSnapshot,
  getFavoritePlacesSnapshot,
  isFavoritePlace,
  subscribeFavoritePlaces,
  toggleFavoritePlace,
} from "@/lib/favorites";
import { Place } from "@/types/travel";

// docs/prd/04-favorites-prd.md §3 "장소 찜" — 코스와 무관하게 개별 장소를 찜한다.
// 코스 찜 버튼(FavoriteButton)과 같은 하트 토글이고, 장소 상세 시트 위에 얹히므로
// 사진 위에서도 보이도록 반투명 검정 배경을 쓴다.
export default function FavoritePlaceButton({ place }: { place: Place }) {
  useSyncExternalStore(
    subscribeFavoritePlaces,
    getFavoritePlacesSnapshot,
    getFavoritePlacesServerSnapshot,
  );
  const favorited = isFavoritePlace(place.placeId);

  return (
    <button
      type="button"
      aria-label={favorited ? "장소 찜 취소" : "장소 찜하기"}
      aria-pressed={favorited}
      onClick={() => toggleFavoritePlace(place)}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-base leading-none"
    >
      {favorited ? "❤️" : "🤍"}
    </button>
  );
}
