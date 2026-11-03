"use client";

import { useState, useSyncExternalStore } from "react";
import LocaleLink from "@/components/LocaleLink";
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
import { CATEGORY_EMOJI } from "@/lib/categories";
import { useI18n } from "@/lib/i18n/I18nProvider";
import PlaceDetailSheet, { DetailPlace } from "@/components/PlaceDetailSheet";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";

// docs/prd/04-favorites-prd.md §4 — 찜 목록은 코스 찜 탭과 장소 찜 탭으로 나눈다.
type Tab = "courses" | "places";

export default function FavoritesPage() {
  const { t } = useI18n();
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
    <div className="page-width px-4 pb-6 pt-8">
      <PageHeader className="mb-4" title={t.favorites.title} expression="heart" />

      {showLoginBanner && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-[var(--radius-card)] bg-[var(--color-primary)]/10 p-4">
          <p className="text-xs text-[var(--color-primary)]">
            {t.favorites.loginBanner}
          </p>
          <LocaleLink
            href="/login"
            className="shrink-0 rounded-[var(--radius-button)] bg-[var(--color-primary)] px-3 py-2 text-xs font-semibold text-[var(--color-on-primary)]"
          >
            {t.favorites.login}
          </LocaleLink>
        </div>
      )}

      <div role="tablist" aria-label={t.favorites.tabsLabel} className="mb-4 flex gap-2">
        <TabButton active={tab === "courses"} onClick={() => setTab("courses")}>
          {t.favorites.tabCourses} {favorites.length > 0 && favorites.length}
        </TabButton>
        <TabButton active={tab === "places"} onClick={() => setTab("places")}>
          {t.favorites.tabPlaces} {places.length > 0 && places.length}
        </TabButton>
      </div>

      {tab === "courses" ? (
        <>
          {favorites.length === 0 && (
            <EmptyState
              expression="heart"
              message={t.favorites.emptyCourses}
              href="/"
              action={t.favorites.emptyCoursesAction}
            />
          )}
          <ul className="space-y-3">
            {favorites.map((fav) => (
              <li
                key={fav.courseId}
                className="surface-card p-4"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h2 className="font-semibold leading-snug">
                    <LocaleLink href={`/course/detail/${fav.courseId}`}>{fav.title}</LocaleLink>
                  </h2>
                  <button
                    type="button"
                    onClick={() => removeFavoriteCourse(fav.courseId)}
                    className="shrink-0 text-xs text-[var(--color-muted)] underline"
                  >
                    {t.favorites.remove}
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
                <LocaleLink
                  href={`/course/detail/${fav.courseId}`}
                  className="mt-3 flex min-h-11 items-center justify-center rounded-[var(--radius-button)] border border-[var(--color-primary)] text-sm font-semibold text-[var(--color-primary)]"
                >
                  {t.course.openDetail}
                </LocaleLink>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          {places.length === 0 && (
            <EmptyState
              expression="smile"
              message={t.favorites.emptyPlaces}
              href="/map"
              action={t.favorites.emptyPlacesAction}
            />
          )}
          <ul className="space-y-3">
            {places.map((fav) => (
              <li
                key={fav.placeId}
                className="surface-card p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold leading-snug">
                      {CATEGORY_EMOJI[fav.category]} {fav.name}
                    </h2>
                    <p className="mt-0.5 truncate text-xs text-[var(--color-muted)]">
                      {fav.placeSnapshot.categoryLabel ?? t.categories[fav.category]} ·{" "}
                      {fav.placeSnapshot.address}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFavoritePlace(fav.placeId)}
                    className="shrink-0 text-xs text-[var(--color-muted)] underline"
                  >
                    {t.favorites.remove}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenPlace(fav.placeSnapshot)}
                  className="mt-3 flex min-h-11 w-full items-center justify-center rounded-[var(--radius-button)] border border-[var(--color-primary)] text-sm font-semibold text-[var(--color-primary)]"
                >
                  {t.place.detail}
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
          ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
          : "border border-[var(--color-border)] text-[var(--color-muted)]"
      }`}
    >
      {children}
    </button>
  );
}

