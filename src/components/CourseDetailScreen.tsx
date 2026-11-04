"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import LocaleLink from "@/components/LocaleLink";
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
import { fill } from "@/lib/i18n/format";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { courseDistance, legDistance } from "@/lib/courseRoute";
import { estimateMinutes, formatDistance, LatLng, nearest } from "@/lib/geo";
import { formatDuration } from "@/lib/agents/schedule";
import { useCurrentPosition } from "@/lib/useCurrentPosition";
import { Course, ItineraryStop, ItineraryTransfer } from "@/types/travel";

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
  const { t } = useI18n();
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

  // 전 구간이 실측이면 주행거리, 아니면 스팟 사이 직선거리 합 — 카드(CourseRouteMap)와
  // 같은 값을 보여주려고 같은 함수를 쓴다.
  //
  // 한 구간이라도 비면 통째로 직선거리로 떨어진다. 절반은 주행거리, 절반은 직선거리인
  // 숫자 하나를 내놓는 것보다 정직하다 — 구간별 줄은 각자 맞는 값을 쓰므로, 머리말만
  // 직선거리인 코스가 나올 수 있다. 그게 맞다.
  const total = useMemo(() => courseDistance(course.days), [course]);
  const closest = useMemo(() => (position ? nearest(position, stops) : null), [position, stops]);

  // 코스 전체의 출발·복귀. 1일차 출발이 서울, 마지막 날 복귀가 서울이다.
  // 찜해 둔 옛 코스에는 아직 없을 수 있어 있을 때만 보여준다.
  const departure = course.days[0]?.departure;
  const arrival = course.days[course.days.length - 1]?.arrival;
  const trip = departure ? { departure, arrival } : null;

  // 폭은 다른 화면과 같은 .page-width를 쓴다. 전에는 혼자 max-w-5xl이라 데스크톱에서는
  // 우연히 값이 같았지만 1024px 미만에서는 다른 코스 화면보다 넓게 벌어졌고, 본문이
  // 80rem까지 넓어진 지금은 헤더만 넓어져 좌우 선이 어긋났을 것이다.
  return (
    <div className="page-width px-4 pb-10 pt-6">
      <LocaleLink href="/" className="text-sm text-[var(--color-muted)]">
        {`← ${t.course.backLabel}`}
      </LocaleLink>

      <div className="mt-2 flex items-start gap-3">
        <h1 className="min-w-0 flex-1 text-xl font-bold leading-snug">{course.title}</h1>
        <FavoriteButton course={course} />
      </div>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        {fill(t.course.dayCount, { days: course.days.length })} ·{" "}
        {fill(t.course.stopCount, { count: stops.length })}
        {total.km > 0 &&
          fill(t.course.routeTotal, {
            distance: formatDistance(total.km),
            kind: total.measured ? t.map.drivingDistance : t.map.straightLine,
          })}
      </p>
      {/* 시각은 모두 서울에서 출발하는 사람 기준이다 (src/lib/agents/schedule.ts). */}
      {trip && (
        <p className="mt-1 text-sm font-semibold text-[var(--color-accent)]">
          🚗 {fill(t.course.departLine, { place: trip.departure.place, at: trip.departure.at })}
          {trip.arrival && fill(t.course.arriveSuffix, { at: trip.arrival.at })}
        </p>
      )}
      {/* 왜 이 코스인지 — 200자 안팎 (src/lib/agents/courseReason.ts) */}
      {course.reason && (
        <p className="mt-3 rounded-[var(--radius-card)] bg-[var(--color-character-ivory)] px-4 py-3 text-sm leading-relaxed text-[var(--color-muted)]">
          <span aria-hidden className="mr-1">💧</span>
          {course.reason}
        </p>
      )}
      {course.notice && (
        <p className="mt-3 notice rounded-xl px-3 py-2 text-sm">⚠️ {course.notice}</p>
      )}

      {/* 모바일에서만 보이는 전환 토글. 데스크톱은 두 단을 함께 보여준다. */}
      <div className="mt-4 flex gap-2 sm:hidden" role="tablist" aria-label={t.course.tabSwitch}>
        {(["plan", "map"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={view === tab}
            onClick={() => setView(tab)}
            className={`min-h-11 flex-1 rounded-[var(--radius-button)] border text-sm font-semibold ${
              view === tab
                ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-muted)]"
            }`}
          >
            {tab === "plan" ? t.course.tabPlan : t.course.tabMap}
          </button>
        ))}
      </div>

      <div className="mt-4 sm:grid sm:grid-cols-2 sm:items-start sm:gap-6">
        <section className={`${view === "plan" ? "" : "hidden"} sm:block`} aria-label={t.course.tabPlan}>
          {course.days.map((day) => (
            <div key={day.day} className="mb-5">
              {course.days.length > 1 && (
                <h2 className="mb-2 text-sm font-bold text-[var(--color-primary)]">
                  {fill(t.course.dayNth, { day: day.day })}
                </h2>
              )}
              {day.departure && <TransferRow transfer={day.departure} kind="depart" />}
              <ol className="space-y-3">
                {day.stops.map((stop, i) => {
                  const index = stops.indexOf(stop);
                  return (
                    <StopRow
                      key={stop.placeId}
                      stop={stop}
                      order={index + 1}
                      nextStop={day.stops[i + 1]}
                      origin={position}
                      onOpen={() => setOpenPlace(stop)}
                    />
                  );
                })}
              </ol>
              {day.arrival && <TransferRow transfer={day.arrival} kind="arrive" />}
            </div>
          ))}
        </section>

        <section
          className={`${view === "map" ? "" : "hidden"} sm:sticky sm:top-4 sm:block`}
          aria-label={t.course.tabMap}
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
            {loading ? t.map.locating : position ? t.map.relocate : t.map.locate}
          </button>

          {error && (
            <p role="status" className="mt-2 notice rounded-xl px-3 py-2 text-xs">
              {error} {t.map.locationFallback}
            </p>
          )}

          {closest && (
            <div className="mt-3 surface-card p-4">
              <p className="text-xs text-[var(--color-muted)]">{t.map.nearestStop}</p>
              <p className="mt-0.5 font-semibold">{closest.item.name}</p>
              <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                {fill(t.map.nearestLineShort, {
                  distance: formatDistance(closest.km),
                  car: estimateMinutes(closest.km, "car"),
                })}
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
  const { t } = useI18n();
  // 영업 상태는 "지금" 기준이다. 이 화면은 클라이언트에서만 그려지므로(코스 출처가
  // 세션 저장소·찜 목록) 서버 렌더 결과와 어긋날 일이 없다.
  const status = getHoursStatus(parseBusinessHours(stop.businessHoursRaw), seoulNow());
  const summary = stop.reason ?? stop.reviewSummary;
  const toNext = nextStop ? legDistance(stop, nextStop) : null;

  return (
    <li className="surface-card p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs font-bold text-[var(--color-on-primary)]">
          {order}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-[var(--color-muted)]">{stop.timeSlot}</p>
          <p className="font-semibold">
            {stop.name}
            <span className="ml-2 text-xs font-normal text-[var(--color-muted)]">
              {stop.categoryLabel ?? t.categories[stop.category]}
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
          aria-label={fill(t.place.openDetailOf, { name: stop.name })}
          className="flex min-h-11 flex-1 items-center justify-center rounded-[var(--radius-button)] border border-[var(--color-border)]"
        >
          {t.place.detail}
        </button>
        <RouteLink
          dest={stop}
          origin={origin ?? undefined}
          className="flex min-h-11 flex-1 items-center justify-center rounded-[var(--radius-button)] border border-[var(--color-primary)] text-[var(--color-primary)]"
        />
      </div>

      {toNext != null && (
        <p className="mt-2 text-center text-xs text-[var(--color-muted)]">
          {/* 실측 구간은 주행거리·주행시간을 그대로 적고, 캐시에 없던 구간(그때그때 만든
              코스, 옛 찜 스냅샷)만 직선거리 어림값이라고 밝힌다.
              이동시간은 일정표의 시각을 만든 값과 같다 — 옛 코스에는 없어 그때만
              화면에서 직접 어림한다. */}
          {fill(toNext.measured ? t.course.nextStopDriving : t.course.nextStop, {
            distance: formatDistance(toNext.km),
            minutes: nextStop?.travelMinutes ?? estimateMinutes(toNext.km, "car"),
          })}
        </p>
      )}
    </li>
  );
}

// 하루의 처음(서울·숙소 출발)과 끝(서울 복귀)에 붙는 줄.
function TransferRow({ transfer, kind }: { transfer: ItineraryTransfer; kind: "depart" | "arrive" }) {
  const { t } = useI18n();

  return (
    <p
      className={`flex items-center gap-2 rounded-[var(--radius-button)] border border-dashed border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-muted)] ${
        kind === "depart" ? "mb-3" : "mt-3"
      }`}
    >
      <span aria-hidden>{kind === "depart" ? "🚗" : "🏠"}</span>
      <span>
        <strong className="font-semibold text-[var(--foreground)]">{transfer.at}</strong>{" "}
        {fill(kind === "depart" ? t.course.transferDepart : t.course.transferArrive, {
          place: transfer.place,
          duration: formatDuration(transfer.minutes),
        })}
        {t.course.transferMove}
      </span>
    </p>
  );
}

// 파이프라인이 만든 코스는 서버에 저장되지 않는다 — 세션이 바뀌거나 링크를 공유받으면 없다.
function NotFound() {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <MascotSpot expression="wow" size={56} className="mb-4" />
      <h1 className="mb-2 text-xl font-bold">{t.course.missingTitle}</h1>
      <p className="text-sm leading-relaxed text-[var(--color-muted)]">
        {t.course.missingBody}
      </p>
      <LocaleLink
        href="/"
        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-button)] bg-[var(--color-primary)] px-6 text-sm font-semibold text-[var(--color-on-primary)]"
      >
        {t.course.missingAction}
      </LocaleLink>
    </div>
  );
}
