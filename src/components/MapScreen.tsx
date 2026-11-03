"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import {
  getFavoritesServerSnapshot,
  getFavoritesSnapshot,
  subscribeFavorites,
} from "@/lib/favorites";
import NaverMapView, { MapStop } from "@/components/NaverMapView";
import PlaceDetailSheet, { DetailPlace } from "@/components/PlaceDetailSheet";
import { RouteLink } from "@/components/RouteLinks";
import { useCurrentPosition } from "@/lib/useCurrentPosition";
import { estimateMinutes, formatDistance, nearest } from "@/lib/geo";
import { fill } from "@/lib/i18n/format";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Place } from "@/types/travel";
import PageHeader from "@/components/PageHeader";

// docs/prd/02-map-realtime-location-prd.md 참조.
// 코스별 상세 화면이 아직 없어, 우선 "찜한 코스"를 골라 지도로 보는 형태로
// 연동한다. 찜한 코스가 없으면 양평 주요 스팟(overviewPlaces)을 보여준다.
export default function MapScreen({ overviewPlaces }: { overviewPlaces: Place[] }) {
  const { t } = useI18n();
  const favorites = useSyncExternalStore(
    subscribeFavorites,
    getFavoritesSnapshot,
    getFavoritesServerSnapshot,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // 마커·목록에서 연 상세 시트의 장소. null이면 닫힌 상태.
  const [openPlace, setOpenPlace] = useState<DetailPlace | null>(null);
  const { position, error, loading, request } = useCurrentPosition();
  const selected = favorites.find((f) => f.courseId === selectedId) ?? favorites[0];

  const { stops, showRoute, subtitle } = useMemo(() => {
    if (selected) {
      const courseStops: MapStop[] = selected.itinerarySnapshot.days
        .flatMap((d) => d.stops)
        .map((stop, i) => ({ lat: stop.lat, lng: stop.lng, name: stop.name, order: i + 1, place: stop }));
      return { stops: courseStops, showRoute: true, subtitle: selected.title };
    }
    const overviewStops: MapStop[] = overviewPlaces.map((place, i) => ({
      lat: place.lat,
      lng: place.lng,
      name: place.name,
      order: i + 1,
      place,
    }));
    return {
      stops: overviewStops,
      showRoute: false,
      subtitle: t.map.subtitleAll,
    };
  }, [selected, overviewPlaces, t.map.subtitleAll]);

  // 지도를 다시 그리지 않도록 핸들러를 고정한다 (NaverMapView의 effect 의존성).
  const handleSelectPlace = useCallback((place: DetailPlace) => setOpenPlace(place), []);

  // 현재 위치에서 가장 가까운 스팟 — 실측 경로 API 연동 전까지 직선거리 기준이다.
  const closest = useMemo(() => (position ? nearest(position, stops) : null), [position, stops]);

  return (
    <div className="page-width px-4 pb-6 pt-6">
      <PageHeader className="mb-4" title={t.map.title} description={subtitle} expression="wow" />

      {favorites.length > 1 && (
        <select
          value={selected?.courseId ?? ""}
          onChange={(e) => setSelectedId(e.target.value)}
          className="mb-4 w-full rounded-[var(--radius-button)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm"
        >
          {favorites.map((f) => (
            <option key={f.courseId} value={f.courseId}>
              {f.title}
            </option>
          ))}
        </select>
      )}

      <NaverMapView
        stops={stops}
        showRoute={showRoute}
        userPosition={position}
        onSelectPlace={handleSelectPlace}
      />

      {/* 위치 권한은 이 버튼을 눌렀을 때만 요청한다 (PRD-02 §4). */}
      <button
        type="button"
        onClick={request}
        disabled={loading}
        className="mt-3 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-[var(--radius-button)] border border-[var(--color-primary)] text-sm font-semibold text-[var(--color-primary)] disabled:opacity-50"
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
          <p className="text-xs text-[var(--color-muted)]">{t.map.nearestPlace}</p>
          <p className="mt-0.5 font-semibold">{closest.item.name}</p>
          <p className="mt-0.5 text-xs text-[var(--color-muted)]">
            {fill(t.map.nearestLine, {
              distance: formatDistance(closest.km),
              car: estimateMinutes(closest.km, "car"),
            })}
            {closest.km < 2 &&
              fill(t.map.walkSuffix, { walk: estimateMinutes(closest.km, "walk") })}{" "}
            {t.map.estimate}
          </p>
          <div className="mt-3">
            <RouteLink
              dest={closest.item}
              origin={position ?? undefined}
              className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--color-primary)]"
            />
          </div>
        </div>
      )}

      {/* 코스 장소 목록도 한 줄로 두면 넓은 화면에서 좌우가 통째로 벌어진다
          — PetPlacesScreen·TopPlaces와 같이 두 열로 나눈다. */}
      <ul className="mt-4 grid gap-2 lg:grid-cols-2">
        {stops.map((stop) => (
          <li
            key={`${stop.order}-${stop.name}`}
            className="flex items-center justify-between gap-2 surface-card px-4 py-2.5 text-sm"
          >
            {stop.place ? (
              <button
                type="button"
                onClick={() => setOpenPlace(stop.place as DetailPlace)}
                aria-haspopup="dialog"
                aria-label={fill(t.place.openDetailOf, { name: stop.name })}
                className="min-w-0 flex-1 truncate text-left"
              >
                <span className="mr-2 text-[var(--color-muted)]">{stop.order}</span>
                {stop.name}
              </button>
            ) : (
              <span className="min-w-0 flex-1 truncate">
                <span className="mr-2 text-[var(--color-muted)]">{stop.order}</span>
                {stop.name}
              </span>
            )}
            <RouteLink
              dest={stop}
              origin={position ?? undefined}
              className="shrink-0 text-xs font-semibold text-[var(--color-primary)]"
            />
          </li>
        ))}
      </ul>

      {openPlace && <PlaceDetailSheet place={openPlace} onClose={() => setOpenPlace(null)} />}
    </div>
  );
}
