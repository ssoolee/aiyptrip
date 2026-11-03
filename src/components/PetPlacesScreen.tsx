"use client";

import { useCallback, useMemo, useState } from "react";
import NaverMapView, { MapStop } from "@/components/NaverMapView";
import PlaceDetailSheet, { DetailPlace } from "@/components/PlaceDetailSheet";
import { fill } from "@/lib/i18n/format";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Category, Place } from "@/types/travel";
import PageHeader from "@/components/PageHeader";

// 칩 순서. 해당 카테고리 장소가 없으면 칩을 숨긴다 (현재 동반 가능 관광지 데이터는 없음).
const FILTERS: (Category | "all")[] = ["all", "restaurant", "cafe", "attraction", "lodging"];

export default function PetPlacesScreen({ places }: { places: Place[] }) {
  const { t } = useI18n();
  const [filter, setFilter] = useState<Category | "all">("all");
  // 열린 상세 시트의 장소. null이면 닫힌 상태.
  const [openPlace, setOpenPlace] = useState<Place | null>(null);
  const visible = useMemo(
    () => (filter === "all" ? places : places.filter((p) => p.category === filter)),
    [places, filter],
  );
  const stops: MapStop[] = useMemo(
    () => visible.map((p, i) => ({ lat: p.lat, lng: p.lng, name: p.name, order: i + 1, place: p })),
    [visible],
  );
  // 지도를 다시 그리지 않도록 핸들러를 고정한다 (NaverMapView의 effect 의존성).
  const handleSelectPlace = useCallback((place: DetailPlace) => setOpenPlace(place), []);

  return (
    <div className="page-width px-4 pb-6 pt-6">
      <PageHeader
        backHref="/course/pet"
        backLabel={t.pet.backLabel}
        title={t.pet.title}
        description={fill(t.pet.description, { count: places.length })}
        expression="heart"
      >
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          {t.pet.sourceNote}
        </p>
      </PageHeader>

      <div className="my-4 flex gap-2 overflow-x-auto">
        {FILTERS.map((f) => {
          const count = f === "all" ? places.length : places.filter((p) => p.category === f).length;
          if (count === 0) return null;
          const active = f === filter;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={active}
              className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold ${
                active
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                  : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-muted)]"
              }`}
            >
              {f === "all" ? t.pet.filterAll : t.categories[f]} {count}
            </button>
          );
        })}
      </div>

      <NaverMapView stops={stops} showRoute={false} onSelectPlace={handleSelectPlace} />

      {/* 한 줄이 1280px까지 늘어나면 업소 이름과 "상세정보" 버튼 사이가 통째로 벌어진다
          — 넓은 화면에서는 두 열로 나눈다 (TopPlaces와 같은 처방). */}
      <ul className="mt-4 grid gap-2 lg:grid-cols-2">
        {visible.map((place, i) => (
          <li
            key={place.placeId}
            className="surface-card p-4"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs font-bold text-[var(--color-on-primary)]">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {place.name}
                  <span className="ml-2 text-xs font-normal text-[var(--color-muted)]">
                    {t.categories[place.category]}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-[var(--color-muted)]">{place.address}</p>
              </div>
            </div>
            <div className="mt-3 flex gap-2 text-sm font-semibold">
              {place.phone && (
                <a
                  href={`tel:${place.phone}`}
                  className="flex min-h-11 flex-1 items-center justify-center rounded-[var(--radius-button)] border border-[var(--color-border)]"
                >
                  {t.place.call}
                </a>
              )}
              <button
                type="button"
                onClick={() => setOpenPlace(place)}
                aria-haspopup="dialog"
                aria-label={fill(t.place.openDetailOf, { name: place.name })}
                className="flex min-h-11 flex-1 items-center justify-center rounded-[var(--radius-button)] border border-[var(--color-primary)] text-[var(--color-primary)]"
              >
                {t.place.detail}
              </button>
            </div>
          </li>
        ))}
      </ul>

      {openPlace && <PlaceDetailSheet place={openPlace} onClose={() => setOpenPlace(null)} />}
    </div>
  );
}
