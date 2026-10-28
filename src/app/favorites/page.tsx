"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  getFavoritePlacesServerSnapshot,
  getFavoritePlacesSnapshot,
  getFavoritesServerSnapshot,
  getFavoritesSnapshot,
  removeFavoriteCourse,
  removeFavoritePlace,
  subscribeFavoritePlaces,
  subscribeFavorites,
} from "@/lib/favorites";
import { useAuth } from "@/lib/auth/AuthProvider";
import { CATEGORY_EMOJI, CATEGORY_LABEL } from "@/lib/categories";
import PlaceDetailSheet, { DetailPlace } from "@/components/PlaceDetailSheet";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";

// docs/prd/04-favorites-prd.md §4 — 찜 목록은 코스 찜 탭과 장소 찜 탭으로 나눈다.
type Tab = "courses" | "places";

export default function FavoritesPage() {
  const favorites = useSyncExternalStore(
    subscribeFavorites,
    getFavoritesSnapshot,
    getFavoritesServerSnapshot,
  );
  const places = useSyncExternalStore(
    subscribeFavoritePlaces,
    getFavoritePlacesSnapshot,
    getFavoritePlacesServerSnapshot,
  );
  const [tab, setTab] = useState<Tab>("courses");
  // 목록에서 연 장소 상세 시트. null이면 닫힌 상태.
  const [openPlace, setOpenPlace] = useState<DetailPlace | null>(null);
  const { user, loading, configured } = useAuth();
  // 비로그인 상태에서 찜이 쌓이면 브라우저 데이터와 함께 사라질 수 있다 -
  // docs/prd/04-favorites-prd.md 10 오픈 이슈의 로그인 유도 배너.
  const showLoginBanner = configured && !loading && !user && favorites.length + places.length > 0;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-6 pt-8">
      <PageHeader className="mb-4" title="찜 목록" expression="heart" />

      {showLoginBanner && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-[var(--radius-card)] bg-[var(--color-primary)]/10 p-4">
          <p className="text-xs text-[var(--color-primary)]">
            이 브라우저에만 저장돼 있어요. 로그인하면 다른 기기에서도 볼 수 있어요.
          </p>
          <Link
            href="/login"
            className="shrink-0 rounded-[var(--radius-button)] bg-[var(--color-primary)] px-3 py-2 text-xs font-semibold text-white"
          >
            로그인
          </Link>
        </div>
      )}

      <div role="tablist" aria-label="찜 종류" className="mb-4 flex gap-2">
        <TabButton active={tab === "courses"} onClick={() => setTab("courses")}>
          코스 {favorites.length > 0 && favorites.length}
        </TabButton>
        <TabButton active={tab === "places"} onClick={() => setTab("places")}>
          장소 {places.length > 0 && places.length}
        </TabButton>
      </div>

      {tab === "courses" ? (
        <>
          {favorites.length === 0 && (
            <EmptyState
              expression="heart"
              message="아직 찜한 코스가 없어요."
              href="/"
              action="코스 추천받으러 가기 →"
            />
          )}
          <ul className="space-y-3">
            {favorites.map((fav) => (
              <li
                key={fav.courseId}
                className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] p-4"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h2 className="font-semibold leading-snug">
                    <Link href={`/course/detail/${fav.courseId}`}>{fav.title}</Link>
                  </h2>
                  <button
                    type="button"
                    onClick={() => removeFavoriteCourse(fav.courseId)}
                    className="shrink-0 text-xs text-[var(--color-muted)] underline"
                  >
                    찜 취소
                  </button>
                </div>
                <ul className="space-y-0.5 text-sm text-[var(--color-muted)]">
                  {fav.itinerarySnapshot.days
                    .flatMap((d) => d.stops)
                    .slice(0, 3)
                    .map((stop, i) => (
                      <li key={i}>
                        {stop.timeSlot} · {stop.name}
                      </li>
                    ))}
                </ul>
                {/* 찜한 코스는 저장돼 있어 링크만으로 다시 열 수 있다 (src/lib/favorites.ts). */}
                <Link
                  href={`/course/detail/${fav.courseId}`}
                  className="mt-3 flex min-h-11 items-center justify-center rounded-[var(--radius-button)] border border-[var(--color-primary)] text-sm font-semibold text-[var(--color-primary)]"
                >
                  지도로 코스 보기 →
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          {places.length === 0 && (
            <EmptyState
              expression="smile"
              message="아직 찜한 장소가 없어요. 코스나 지도에서 장소를 열면 하트를 누를 수 있어요."
              href="/map"
              action="지도 보러 가기 →"
            />
          )}
          <ul className="space-y-3">
            {places.map((fav) => (
              <li
                key={fav.placeId}
                className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold leading-snug">
                      {CATEGORY_EMOJI[fav.category]} {fav.name}
                    </h2>
                    <p className="mt-0.5 truncate text-xs text-[var(--color-muted)]">
                      {fav.placeSnapshot.categoryLabel ?? CATEGORY_LABEL[fav.category]} ·{" "}
                      {fav.placeSnapshot.address}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFavoritePlace(fav.placeId)}
                    className="shrink-0 text-xs text-[var(--color-muted)] underline"
                  >
                    찜 취소
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenPlace(fav.placeSnapshot)}
                  className="mt-3 flex min-h-11 w-full items-center justify-center rounded-[var(--radius-button)] border border-[var(--color-primary)] text-sm font-semibold text-[var(--color-primary)]"
                >
                  상세보기
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {openPlace && <PlaceDetailSheet place={openPlace} onClose={() => setOpenPlace(null)} />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`min-h-11 flex-1 rounded-[var(--radius-button)] text-sm font-semibold ${
        active
          ? "bg-[var(--color-primary)] text-white"
          : "border border-[var(--color-border)] text-[var(--color-muted)]"
      }`}
    >
      {children}
    </button>
  );
}

