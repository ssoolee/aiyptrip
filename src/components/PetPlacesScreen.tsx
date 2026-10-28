"use client";

import { useCallback, useMemo, useState } from "react";
import NaverMapView, { MapStop } from "@/components/NaverMapView";
import PlaceDetailSheet, { DetailPlace } from "@/components/PlaceDetailSheet";
import { CATEGORY_LABEL } from "@/lib/categories";
import { Category, Place } from "@/types/travel";
import PageHeader from "@/components/PageHeader";

// 칩 순서. 해당 카테고리 장소가 없으면 칩을 숨긴다 (현재 동반 가능 관광지 데이터는 없음).
const FILTERS: (Category | "all")[] = ["all", "restaurant", "cafe", "attraction", "lodging"];

export default function PetPlacesScreen({ places }: { places: Place[] }) {
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
    <div className="mx-auto max-w-2xl px-4 pb-6 pt-6">
      <PageHeader
        backHref="/course/pet"
        backLabel="반려동물 코스 보기"
        title="🐾 반려동물 동반 업소"
        description={`양평에서 반려동물과 함께 갈 수 있는 ${places.length}곳이에요. 동반 조건(크기·실내 입장)은 업소마다 달라 방문 전에 꼭 확인하세요.`}
        expression="heart"
      >
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          출처: 식품안전나라 반려동물 동반 가능 업소 현황(2026. 9. 28. 기준), 한국관광공사 장소 소개글
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
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                  : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-muted)]"
              }`}
            >
              {f === "all" ? "전체" : CATEGORY_LABEL[f]} {count}
            </button>
          );
        })}
      </div>

      <NaverMapView stops={stops} showRoute={false} onSelectPlace={handleSelectPlace} />

      <ul className="mt-4 space-y-2">
        {visible.map((place, i) => (
          <li
            key={place.placeId}
            className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] p-4"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs font-bold text-white">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {place.name}
                  <span className="ml-2 text-xs font-normal text-[var(--color-muted)]">
                    {CATEGORY_LABEL[place.category]}
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
                  전화하기
                </a>
              )}
              <button
                type="button"
                onClick={() => setOpenPlace(place)}
                aria-haspopup="dialog"
                aria-label={`${place.name} 상세정보 보기`}
                className="flex min-h-11 flex-1 items-center justify-center rounded-[var(--radius-button)] border border-[var(--color-primary)] text-[var(--color-primary)]"
              >
                상세정보
              </button>
            </div>
          </li>
        ))}
      </ul>

      {openPlace && <PlaceDetailSheet place={openPlace} onClose={() => setOpenPlace(null)} />}
    </div>
  );
}
