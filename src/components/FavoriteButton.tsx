"use client";

import { useSyncExternalStore } from "react";
import {
  getFavoritesServerSnapshot,
  getFavoritesSnapshot,
  isFavoriteCourse,
  subscribeFavorites,
  toggleFavoriteCourse,
} from "@/lib/favorites";
import { Course } from "@/types/travel";

export default function FavoriteButton({ course }: { course: Course }) {
  useSyncExternalStore(subscribeFavorites, getFavoritesSnapshot, getFavoritesServerSnapshot);
  const favorited = isFavoriteCourse(course.courseId);

  return (
    <button
      type="button"
      aria-label={favorited ? "찜 취소" : "찜하기"}
      onClick={(e) => {
        e.preventDefault();
        toggleFavoriteCourse(course);
      }}
      className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-card)] text-xl shadow"
    >
      {favorited ? "❤️" : "🤍"}
    </button>
  );
}
