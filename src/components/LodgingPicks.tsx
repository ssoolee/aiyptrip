"use client";

import { useState } from "react";
import PlaceDetailSheet from "@/components/PlaceDetailSheet";
import { cardGridClass } from "@/lib/cardGrid";
import { CATEGORY_EMOJI } from "@/lib/categories";
import { LodgingPick } from "@/types/travel";
import { fill } from "@/lib/i18n/format";
import { useI18n } from "@/lib/i18n/I18nProvider";

// MBTI 유형별 숙소·펜션 추천 — 코스 카드와 따로, 코스 목록 아래에 보여준다.
export default function LodgingPicks({ title, picks }: { title: string; picks: LodgingPick[] }) {
  const { t } = useI18n();
  const [openPick, setOpenPick] = useState<LodgingPick | null>(null);

  if (picks.length === 0) return null;

  // 숙소가 한 곳뿐이면(지금 열여섯 유형 모두 그렇다) 코스 카드와 같이 가로로 가른다 —
  // 좁은 카드를 가운데로 모으기만 하면 제목은 왼쪽 끝인데 카드만 가운데라 어색하다.
  const single = picks.length === 1;

  return (
    <section className="mt-10 px-4">
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      <ul className={single ? "grid grid-cols-1 gap-4" : cardGridClass(picks.length)}>
        {picks.map((pick) => (
          <li
            key={pick.placeId}
            className={`overflow-hidden surface-card${single ? " lg:grid lg:grid-cols-2" : ""}`}
          >
            {pick.photos[0] ? (
              <div className={single ? "relative lg:min-h-56" : undefined}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pick.photos[0]}
                  alt={pick.name}
                  loading="lazy"
                  className={`w-full object-cover ${
                    single ? "h-36 lg:absolute lg:inset-0 lg:h-full" : "h-36"
                  }`}
                />
              </div>
            ) : (
              <div
                className={`flex h-24 items-center justify-center bg-[var(--color-character-blue)]/15 text-3xl${
                  single ? " lg:h-auto lg:min-h-56" : ""
                }`}
                aria-hidden
              >
                {CATEGORY_EMOJI.lodging}
              </div>
            )}
            <div className={`p-4${single ? " lg:border-l lg:border-[var(--color-border)]" : ""}`}>
              <span className="mb-1 inline-block rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 text-xs font-medium text-[var(--color-primary)]">
                {pick.lodgingType}
              </span>
              <h3 className="font-semibold leading-snug">{pick.name}</h3>
              {pick.reason && <p className="mt-1 text-sm text-[var(--color-muted)]">{pick.reason}</p>}
              {pick.notice && (
                <p className="mt-2 rounded-[var(--radius-button)] bg-[var(--color-primary)]/5 px-2.5 py-1.5 text-xs text-[var(--color-muted)]">
                  {t.course.lodgingNotice}: {pick.notice}
                </p>
              )}
              <p className="mt-2 text-xs text-[var(--color-muted)]">{pick.address}</p>
              <div className="mt-3 flex gap-2 text-sm font-semibold">
                {pick.phone && (
                  <a
                    href={`tel:${pick.phone}`}
                    className="flex min-h-11 flex-1 items-center justify-center rounded-[var(--radius-button)] border border-[var(--color-border)]"
                  >
                    {t.place.call}
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setOpenPick(pick)}
                  aria-haspopup="dialog"
                  aria-label={fill(t.place.openDetailOf, { name: pick.name })}
                  className="flex min-h-11 flex-1 items-center justify-center rounded-[var(--radius-button)] border border-[var(--color-primary)] text-[var(--color-primary)]"
                >
                  {t.place.detail}
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
