"use client";

import { useState } from "react";
import PlaceDetailSheet from "@/components/PlaceDetailSheet";
import { CATEGORY_EMOJI } from "@/lib/categories";
import { LodgingPick } from "@/types/travel";

// MBTI 유형별 숙소·펜션 추천 — 코스 카드와 따로, 코스 목록 아래에 보여준다.
export default function LodgingPicks({ title, picks }: { title: string; picks: LodgingPick[] }) {
  const [openPick, setOpenPick] = useState<LodgingPick | null>(null);

  if (picks.length === 0) return null;

  return (
    <section className="mt-10 px-4">
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {picks.map((pick) => (
          <li
            key={pick.placeId}
            className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)]"
          >
            {pick.photos[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={pick.photos[0]} alt={pick.name} loading="lazy" className="h-36 w-full object-cover" />
            ) : (
              <div
                className="flex h-24 items-center justify-center bg-[var(--color-character-blue)]/15 text-3xl"
                aria-hidden
              >
                {CATEGORY_EMOJI.lodging}
              </div>
            )}
            <div className="p-4">
              <span className="mb-1 inline-block rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 text-xs font-medium text-[var(--color-primary)]">
                {pick.lodgingType}
              </span>
              <h3 className="font-semibold leading-snug">{pick.name}</h3>
              {pick.reason && <p className="mt-1 text-sm text-[var(--color-muted)]">{pick.reason}</p>}
              {pick.notice && (
                <p className="mt-2 rounded-[var(--radius-button)] bg-[var(--color-primary)]/5 px-2.5 py-1.5 text-xs text-[var(--color-muted)]">
                  예약 전 확인: {pick.notice}
                </p>
              )}
              <p className="mt-2 text-xs text-[var(--color-muted)]">{pick.address}</p>
              <div className="mt-3 flex gap-2 text-sm font-semibold">
                {pick.phone && (
                  <a
                    href={`tel:${pick.phone}`}
                    className="flex min-h-11 flex-1 items-center justify-center rounded-[var(--radius-button)] border border-[var(--color-border)]"
                  >
                    전화하기
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setOpenPick(pick)}
                  aria-haspopup="dialog"
                  aria-label={`${pick.name} 상세정보 보기`}
                  className="flex min-h-11 flex-1 items-center justify-center rounded-[var(--radius-button)] border border-[var(--color-primary)] text-[var(--color-primary)]"
                >
                  상세정보
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {openPick && <PlaceDetailSheet place={openPick} onClose={() => setOpenPick(null)} />}
    </section>
  );
}
