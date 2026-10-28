"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CATEGORY_EMOJI, CATEGORY_LABEL } from "@/lib/categories";
import {
  formatRange,
  getHoursStatus,
  parseBusinessHours,
  seoulNow,
  WEEKDAY_DISPLAY_ORDER,
  WEEKDAY_LABELS,
  type HoursStatus,
  type ParsedBusinessHours,
} from "@/lib/businessHours";
import { PLACE_TAGS, isPlaceTag } from "@/lib/placeTags";
import { RouteButtons } from "@/components/RouteLinks";
import HoursStatusBadge from "@/components/HoursStatusBadge";
import FavoritePlaceButton from "@/components/FavoritePlaceButton";
import PlaceReviews from "@/components/PlaceReviews";
import { ItineraryStop, Place } from "@/types/travel";

// 코스 스팟(시간대·추천 이유 포함)과 일반 장소를 모두 받는다.
export type DetailPlace = Place & Partial<Pick<ItineraryStop, "timeSlot" | "reason">>;

// PRD-03 §4 — 모바일은 바텀시트, 데스크톱(sm 이상)은 오른쪽 사이드 패널.
// 정보 우선순위: 사진 → 이름/카테고리 → 영업상태 → 주소/전화 → 리뷰 요약 →
// 네이버 블로그 리뷰 → 지도 링크.
export default function PlaceDetailSheet({ place, onClose }: { place: DetailPlace; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);

  const parsedHours = useMemo(() => parseBusinessHours(place.businessHoursRaw), [place.businessHoursRaw]);
  // 영업 상태는 "지금" 기준이라 서버 렌더 결과와 어긋날 수 있다. 시트는 사용자가 누른
  // 뒤에만 그려지므로 클라이언트에서 계산해도 하이드레이션 불일치가 없다.
  const status = useMemo<HoursStatus>(() => getHoursStatus(parsedHours, seoulNow()), [parsedHours]);

  useEffect(() => {
    panelRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    // 시트 뒤 본문이 같이 스크롤되지 않게 잠근다.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const tags = place.tags.filter(isPlaceTag);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-stretch sm:justify-end">
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="sheet-backdrop absolute inset-0 bg-black/50"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${place.name} 상세정보`}
        tabIndex={-1}
        className="sheet-panel relative max-h-[88vh] w-full overflow-y-auto rounded-t-[20px] bg-[var(--color-card)] pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl outline-none sm:max-h-none sm:w-[400px] sm:rounded-none sm:rounded-l-[20px]"
      >
        <PhotoGallery photos={place.photos} name={place.name} category={place.category} />

        <div className="absolute right-3 top-3 flex gap-2">
          {/* 장소 찜 (PRD-04 §3) — 코스 찜과 별도로 쌓이고 찜 목록의 "장소" 탭에 모인다. */}
          <FavoritePlaceButton place={place} />
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-lg leading-none text-white"
          >
            ✕
          </button>
        </div>

        <div className="p-4">
          <div className="flex items-baseline gap-2">
            <h2 className="text-lg font-bold leading-snug">{place.name}</h2>
            <span className="shrink-0 text-xs text-[var(--color-muted)]">
              {place.categoryLabel ?? CATEGORY_LABEL[place.category]}
            </span>
          </div>

          {(place.timeSlot || place.rating != null || place.petFriendly) && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              {place.timeSlot && (
                <span className="rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 font-medium text-[var(--color-primary)]">
                  {place.timeSlot} 방문
                </span>
              )}
              {place.rating != null && <span className="font-medium">⭐ {place.rating.toFixed(1)}</span>}
              {place.petFriendly && (
                <span className="rounded-full bg-[var(--color-accent)]/20 px-2 py-0.5 font-medium">
                  🐾 반려동물 동반
                </span>
              )}
            </div>
          )}

          <div className="mt-3">
            <HoursStatusBadge status={status} />
          </div>
          <HoursTable parsedHours={parsedHours} raw={place.businessHoursRaw} />

          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <dt className="sr-only">주소</dt>
              <dd className="min-w-0 flex-1 text-[var(--color-muted)]">📍 {place.address}</dd>
              <CopyAddressButton address={place.address} />
            </div>
            {place.phone && (
              <div>
                <dt className="sr-only">전화번호</dt>
                <dd className="text-[var(--color-muted)]">📞 {place.phone}</dd>
              </div>
            )}
          </dl>

          {(place.reason ?? place.reviewSummary) && (
            <p className="mt-4 rounded-[var(--radius-card)] bg-[var(--color-primary)]/5 p-3 text-sm leading-relaxed">
              {place.reason ?? place.reviewSummary}
            </p>
          )}

          <PlaceReviews key={place.name} placeName={place.name} />

          {tags.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-xs text-[var(--color-muted)]"
                >
                  {PLACE_TAGS[tag]}
                </li>
              ))}
            </ul>
          )}

          {/* 길찾기는 외부 지도 앱으로 넘긴다 (PRD-02 §3 Should — 네이버 우선, 티맵 차순위) */}
          <div className="mt-5">
            <RouteButtons dest={{ lat: place.lat, lng: place.lng, name: place.name }} />
          </div>

          <div className="mt-2 flex gap-2 text-sm font-semibold">
            {place.phone && (
              <a
                href={`tel:${place.phone}`}
                className="flex min-h-11 flex-1 items-center justify-center rounded-[var(--radius-button)] border border-[var(--color-border)]"
              >
                전화하기
              </a>
            )}
            <a
              href={place.mapUrl}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-11 flex-1 items-center justify-center rounded-[var(--radius-button)] border border-[var(--color-border)]"
            >
              네이버 지도에서 보기
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// 사진 여러 장은 좌우 스와이프(스크롤 스냅)로 넘긴다. PRD-03 §6에 따라 지연 로딩.
function PhotoGallery({ photos, name, category }: Pick<DetailPlace, "photos" | "name" | "category">) {
  if (photos.length === 0) {
    return (
      <div
        className="flex h-32 items-center justify-center bg-[var(--color-character-blue)]/15 text-4xl sm:h-40"
        aria-hidden
      >
        {CATEGORY_EMOJI[category]}
      </div>
    );
  }

  return (
    <div className="flex snap-x snap-mandatory overflow-x-auto">
      {photos.map((photo, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={photo}
          src={photo}
          alt={photos.length > 1 ? `${name} 사진 ${i + 1}/${photos.length}` : name}
          loading="lazy"
          className="h-52 w-full shrink-0 snap-center object-cover sm:h-56"
        />
      ))}
    </div>
  );
}

function HoursTable({ parsedHours, raw }: { parsedHours: ParsedBusinessHours | null; raw: string | undefined }) {
  // 파싱 실패 시에도 원본 텍스트는 노출한다 (PRD-03 §5).
  if (!parsedHours) {
    return (
      <p className="mt-2 text-xs text-[var(--color-muted)]">
        {raw ?? "영업시간이 수집되지 않은 장소예요. 방문 전 네이버 지도에서 확인하세요."}
      </p>
    );
  }

  const today = seoulNow().weekday;
  return (
    <>
      <table className="mt-2 w-full text-xs">
        <caption className="sr-only">요일별 영업시간</caption>
        <tbody>
          {WEEKDAY_DISPLAY_ORDER.map((weekday) => {
            const day = parsedHours.days.find((d) => d.weekday === weekday);
            if (!day) return null;
            return (
              <tr key={weekday} className={weekday === today ? "font-semibold" : "text-[var(--color-muted)]"}>
                <th scope="row" className="w-8 py-0.5 text-left font-normal">
                  {WEEKDAY_LABELS[weekday]}
                </th>
                <td className="py-0.5">{day.closed ? "정기휴무" : day.ranges.map(formatRange).join(", ")}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {parsedHours.note && <p className="mt-1 text-xs text-[var(--color-muted)]">{parsedHours.note}</p>}
    </>
  );
}

function CopyAddressButton({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 권한이 없거나 보안 컨텍스트가 아니면 조용히 넘긴다 — 주소는 화면에 그대로 있다.
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="shrink-0 rounded-[var(--radius-button)] border border-[var(--color-border)] px-2.5 py-1 text-xs font-semibold"
    >
      {copied ? "복사됨" : "주소 복사"}
    </button>
  );
}
