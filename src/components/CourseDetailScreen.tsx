"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import FavoriteButton from "@/components/FavoriteButton";
import NaverMapView, { MapStop } from "@/components/NaverMapView";
import PlaceDetailSheet, { DetailPlace } from "@/components/PlaceDetailSheet";
import HoursStatusBadge from "@/components/HoursStatusBadge";
import MascotSpot from "@/components/MascotSpot";
import { RouteLink } from "@/components/RouteLinks";
import { readCachedCourse } from "@/lib/courseCache";
import {
  getFavoritesServerSnapshot,
  getFavoritesSnapshot,
  subscribeFavorites,
} from "@/lib/favorites";
import { getHoursStatus, parseBusinessHours, seoulNow } from "@/lib/businessHours";
import { CATEGORY_LABEL } from "@/lib/categories";
import { distanceKm, estimateMinutes, formatDistance, LatLng, nearest } from "@/lib/geo";
import { useCurrentPosition } from "@/lib/useCurrentPosition";
import { Course, ItineraryStop } from "@/types/travel";

// docs/prd/02-map-realtime-location-prd.md §4 — 모바일은 지도/일정 탭 전환,
// 데스크톱(sm↑)은 좌측 일정·우측 지도 2단.

// 세션 저장소에 담긴 코스는 보는 동안 바뀌지 않아 구독할 것이 없다.
const neverChanges = () => () => {};

export default function CourseDetailScreen({
  courseId,
  initialCourse,
}: {
  courseId: string;
  // 큐레이션 코스는 ID가 고정이라 서버에서 찾아 넘긴다 (새로고침·링크 공유 가능).
  initialCourse?: Course;
}) {
  const favorites = useSyncExternalStore(
    subscribeFavorites,
    getFavoritesSnapshot,
    getFavoritesServerSnapshot,
  );
  const cached = useSyncExternalStore(
    neverChanges,
    () => readCachedCourse(courseId),
    () => null,
  );
  const course =
    initialCourse ?? favorites.find((f) => f.courseId === courseId)?.itinerarySnapshot ?? cached;

  if (!course) return <NotFound />;
  return <CourseDetail course={course} />;
}

function CourseDetail({ course }: { course: Course }) {
  const [view, setView] = useState<"plan" | "map">("plan");
  const [openPlace, setOpenPlace] = useState<DetailPlace | null>(null);
  const { position, error, loading, request } = useCurrentPosition();

  const stops = useMemo(() => course.days.flatMap((day) => day.stops), [course]);
  const mapStops = useMemo<MapStop[]>(
    () =>
      stops.map((stop, i) => ({
        lat: stop.lat,
        lng: stop.lng,
        name: stop.name,
        order: i + 1,
        place: stop,
      })),
    [stops],
  );
  // 지도를 다시 그리지 않도록 핸들러를 고정한다 (NaverMapView의 effect 의존성).
  const handleSelectPlace = useCallback((place: DetailPlace) => setOpenPlace(place), []);

  // 스팟 사이 직선거리 합 — 주행거리가 아니라 동선 규모를 가늠하는 값이다.
  const totalKm = useMemo(
    () => stops.slice(1).reduce((sum, stop, i) => sum + distanceKm(stops[i], stop), 0),
    [stops],
  );
  const closest = useMemo(() => (position ? nearest(position, stops) : null), [position, stops]);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-10 pt-6">
      <Link href="/" className="text-sm text-[var(--color-muted)]">
        ← 다른 코스 보기
      </Link>

      <div className="mt-2 flex items-start gap-3">
        <h1 className="min-w-0 flex-1 text-xl font-bold leading-snug">{course.title}</h1>
        <FavoriteButton course={course} />
      </div>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        {course.days.length}일 코스 · {stops.length}곳
        {totalKm > 0 && ` · 전체 ${formatDistance(totalKm)}(직선거리)`}
      </p>
      {course.notice && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">⚠️ {course.notice}</p>
      )}

      {/* 모바일에서만 보이는 전환 토글. 데스크톱은 두 단을 함께 보여준다. */}
      <div className="mt-4 flex gap-2 sm:hidden" role="tablist" aria-label="보기 전환">
        {(["plan", "map"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={view === tab}
            onClick={() => setView(tab)}
            className={`min-h-11 flex-1 rounded-[var(--radius-button)] border text-sm font-semibold ${
              view === tab
                ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-muted)]"
            }`}
          >
            {tab === "plan" ? "일정" : "지도"}
          </button>
        ))}
      </div>

      <div className="mt-4 sm:grid sm:grid-cols-2 sm:items-start sm:gap-6">
        <section className={`${view === "plan" ? "" : "hidden"} sm:block`} aria-label="일정">
          {course.days.map((day) => (
            <div key={day.day} className="mb-5">
              {course.days.length > 1 && (
                <h2 className="mb-2 text-sm font-bold text-[var(--color-primary)]">{day.day}일차</h2>
              )}
              <ol className="space-y-3">
                {day.stops.map((stop) => {
                  const index = stops.indexOf(stop);
                  return (
                    <StopRow
                      key={stop.placeId}
                      stop={stop}
                      order={index + 1}
                      nextStop={stops[index + 1]}
                      origin={position}
                      onOpen={() => setOpenPlace(stop)}
                    />
                  );
                })}
              </ol>
            </div>
          ))}
        </section>

        <section
          className={`${view === "map" ? "" : "hidden"} sm:sticky sm:top-4 sm:block`}
          aria-label="지도"
        >
          <NaverMapView
            stops={mapStops}
            showRoute
            userPosition={position}
            onSelectPlace={handleSelectPlace}
            heightClass="h-[45vh] sm:h-[28rem]"
          />

          {/* 위치 권한은 이 버튼을 눌렀을 때만 요청한다 (PRD-02 §4). */}
          <button
            type="button"
            onClick={request}
            disabled={loading}
            className="mt-3 flex min-h-11 w-full items-center justify-center rounded-[var(--radius-button)] border border-[var(--color-primary)] text-sm font-semibold text-[var(--color-primary)] disabled:opacity-50"
          >
            {loading ? "현재 위치를 찾는 중..." : position ? "📍 현재 위치 다시 찾기" : "📍 내 위치 보기"}
          </button>

          {error && (
            <p role="status" className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {error} 위치 없이도 코스와 동선은 그대로 볼 수 있어요.
            </p>
          )}

          {closest && (
            <div className="mt-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] p-4">
              <p className="text-xs text-[var(--color-muted)]">현재 위치에서 가장 가까운 스팟</p>
              <p className="mt-0.5 font-semibold">{closest.item.name}</p>
              <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                직선거리 {formatDistance(closest.km)} · 차로 약 {estimateMinutes(closest.km, "car")}분 (어림값)
              </p>
              <RouteLink
                dest={closest.item}
                origin={position ?? undefined}
                className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--color-primary)]"
              />
            </div>
          )}
        </section>
      </div>

      {openPlace && <PlaceDetailSheet place={openPlace} onClose={() => setOpenPlace(null)} />}
    </div>
  );
}

function StopRow({
  stop,
  order,
  nextStop,
  origin,
  onOpen,
}: {
  stop: ItineraryStop;
  order: number;
  nextStop?: ItineraryStop;
  origin: LatLng | null;
  onOpen: () => void;
}) {
  // 영업 상태는 "지금" 기준이다. 이 화면은 클라이언트에서만 그려지므로(코스 출처가
  // 세션 저장소·찜 목록) 서버 렌더 결과와 어긋날 일이 없다.
  const status = getHoursStatus(parseBusinessHours(stop.businessHoursRaw), seoulNow());
  const summary = stop.reason ?? stop.reviewSummary;
  const toNextKm = nextStop ? distanceKm(stop, nextStop) : null;

  return (
    <li className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs font-bold text-white">
          {order}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-[var(--color-muted)]">{stop.timeSlot}</p>
          <p className="font-semibold">
            {stop.name}
            <span className="ml-2 text-xs font-normal text-[var(--color-muted)]">
              {stop.categoryLabel ?? CATEGORY_LABEL[stop.category]}
            </span>
          </p>
          <div className="mt-1.5">
            <HoursStatusBadge status={status} />
          </div>
          {summary && <p className="mt-2 text-sm text-[var(--color-muted)]">{summary}</p>}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 text-sm font-semibold">
        <button
          type="button"
          onClick={onOpen}
          aria-haspopup="dialog"
          aria-label={`${stop.name} 상세정보 보기`}
          className="flex min-h-11 flex-1 items-center justify-center rounded-[var(--radius-button)] border border-[var(--color-border)]"
        >
          상세정보
        </button>
        <RouteLink
          dest={stop}
          origin={origin ?? undefined}
          className="flex min-h-11 flex-1 items-center justify-center rounded-[var(--radius-button)] border border-[var(--color-primary)] text-[var(--color-primary)]"
        />
      </div>

      {toNextKm != null && (
        <p className="mt-2 text-center text-xs text-[var(--color-muted)]">
          ↓ 다음 장소까지 {formatDistance(toNextKm)} · 차로 약 {estimateMinutes(toNextKm, "car")}분 (직선거리 어림값)
        </p>
      )}
    </li>
  );
}

// 파이프라인이 만든 코스는 서버에 저장되지 않는다 — 세션이 바뀌거나 링크를 공유받으면 없다.
function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <MascotSpot expression="wow" size={56} className="mb-4" />
      <h1 className="mb-2 text-xl font-bold">어라, 이 코스를 찾지 못했어요</h1>
      <p className="text-sm leading-relaxed text-[var(--color-muted)]">
        추천 코스는 요청할 때마다 새로 만들어져서 브라우저를 다시 열면 사라져요. 마음에 드는
        코스는 찜해 두면 언제든 다시 볼 수 있어요.
      </p>
      <Link
        href="/"
        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-button)] bg-[var(--color-primary)] px-6 text-sm font-semibold text-white"
      >
        코스 추천받기
      </Link>
    </div>
  );
}
