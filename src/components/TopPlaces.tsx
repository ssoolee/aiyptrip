import Mascot from "@/components/Mascot";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { fill } from "@/lib/i18n/format";
import { currentLocale, serverDictionary } from "@/lib/i18n/server";
import { TopPlace } from "@/types/travel";

// 네이버 블로그 글이 많은 양평 카페·맛집 네 곳씩. 두 가지 잣대로 줄을 세운다.
//   · 최근 한 달 — 그 기간에 올라온 글 수. 지금 사람들이 가는 곳에 가깝다.
//   · 전체 기간 — 블로그 글 총수. 쌓인 유명세다.
// 순위의 근거를 화면에도 그대로 적는다 — 네이버 플레이스의 방문자 리뷰·별점은 공개
// API로 받을 수 없어 블로그 글 수로 대신한다 (src/lib/api/naverBlogSearch.ts 머리말).

export default async function TopPlaces({
  cafe,
  restaurant,
  recentCafe,
  recentRestaurant,
  recentDays,
}: {
  cafe: TopPlace[];
  restaurant: TopPlace[];
  recentCafe: TopPlace[];
  recentRestaurant: TopPlace[];
  recentDays: number;
}) {
  const hasRecent = recentCafe.length > 0 || recentRestaurant.length > 0;
  const hasAllTime = cafe.length > 0 || restaurant.length > 0;
  if (!hasRecent && !hasAllTime) return null;

  const [locale, { top }] = await Promise.all([currentLocale(), serverDictionary()]);
  // 숫자 자리 구분(1,234)은 언어를 따라간다.
  const numberLocale = locale === "ko" ? "ko-KR" : "en-US";

  return (
    <div className="space-y-6">
      {hasRecent && (
        <div className="space-y-5">
          <Band label={fill(top.recentBandLabel, { days: recentDays })} note={top.recentBandNote} />
          <Group title={top.groupCafe} places={recentCafe} recentDays={recentDays} top={top} numberLocale={numberLocale} />
          <Group title={top.groupRestaurant} places={recentRestaurant} recentDays={recentDays} top={top} numberLocale={numberLocale} />
        </div>
      )}

      {hasAllTime && (
        <div className="space-y-5">
          <Band label={top.allBandLabel} note={top.allBandNote} />
          <Group title={top.groupCafe} places={cafe} top={top} numberLocale={numberLocale} />
          <Group title={top.groupRestaurant} places={restaurant} top={top} numberLocale={numberLocale} />
        </div>
      )}

      <p className="text-xs text-[var(--color-subtle)]">
        {top.note}
      </p>
    </div>
  );
}

/** 두 순위를 섞어 보지 않도록 묶음 앞에 기준을 적어 둔다. */
function Band({ label, note }: { label: string; note: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span className="rounded-[var(--radius-button)] bg-[var(--color-primary)] px-2.5 py-0.5 text-xs font-bold text-[var(--color-on-primary)]">
        {label}
      </span>
      <span className="text-xs text-[var(--color-muted)]">{note}</span>
    </div>
  );
}

function Group({
  title,
  places,
  recentDays,
  top,
  numberLocale,
}: {
  title: string;
  places: TopPlace[];
  recentDays?: number;
  top: Dictionary["top"];
  numberLocale: string;
}) {
  if (places.length === 0) return null;

  return (
    <section>
      <h3 className="mb-2 text-sm font-bold text-[var(--color-primary)]">{title}</h3>
      {/* 한 줄이 1024px까지 늘어나면 오른쪽이 텅 빈다 — 넓은 화면에서는 두 열로 나눈다. */}
      <ul className="grid gap-2 lg:grid-cols-2">
        {places.map((place, index) => (
          <li key={place.placeId}>
            <PlaceRow
              place={place}
              rank={index + 1}
              recentDays={recentDays}
              top={top}
              numberLocale={numberLocale}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function PlaceRow({
  place,
  rank,
  recentDays,
  top,
  numberLocale,
}: {
  place: TopPlace;
  rank: number;
  recentDays?: number;
  top: Dictionary["top"];
  numberLocale: string;
}) {
  // "경기도 양평군 서종면 북한강로 1161" → "서종면" — 한 줄에 들어가게 읍·면만 남긴다.
  //
  // 외국어에서는 주소가 "1161 Bukhangang-ro, Seojong-myeon, Yangpyeong-gun, Gyeonggi-do"로
  // 번역돼 있어 한국어 규칙이 걸리지 않는다. 로마자 표기(-myeon/-eup/-dong/-ri)를 한 번 더 본다.
  const area =
    /양평군\s+(\S+)/.exec(place.address)?.[1] ??
    /([A-Za-z]+-(?:myeon|eup|dong|ri))/i.exec(place.address)?.[1] ??
    top.areaFallback;
  // 최근 묶음은 그 기간의 글 수가 순위의 근거다. 전체 기간 합계는 괄호로 덧붙인다.
  const recentCount = recentDays != null ? place.recentBlogCount : undefined;

  return (
    <a
      href={place.mapUrl}
      target="_blank"
      rel="noreferrer"
      className="surface-card lift flex gap-3 overflow-hidden p-2"
    >
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[var(--color-character-ivory)]">
        {place.photos[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={place.photos[0]} alt={place.name} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center">
            <Mascot expression="smile" size={32} />
          </span>
        )}
        <span className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary)] text-[11px] font-bold text-[var(--color-on-primary)]">
          {rank}
        </span>
      </div>

      <div className="min-w-0 flex-1 py-0.5">
        <p className="truncate text-sm font-bold">{place.name}</p>
        <p className="truncate text-xs text-[var(--color-muted)]">
          {area}
          {place.categoryLabel && ` · ${place.categoryLabel}`}
        </p>
        <p className="mt-1 text-xs font-semibold text-[var(--color-accent)]">
          {recentCount != null ? (
            <>
              {fill(top.recentCount, {
                days: recentDays ?? 0,
                count: recentCount.toLocaleString(numberLocale),
              })}
              {place.recentBlogCapped && top.orMore}
              {place.blogReviewCount > 0 && (
                <span className="font-normal text-[var(--color-muted)]">
                  {" "}
                  {fill(top.allCount, { count: place.blogReviewCount.toLocaleString(numberLocale) })}
                </span>
              )}
            </>
          ) : (
            <>{fill(top.blogCount, { count: place.blogReviewCount.toLocaleString(numberLocale) })}</>
          )}
        </p>
        {place.reviewTitle && (
          <p className="mt-0.5 line-clamp-1 text-[11px] text-[var(--color-subtle)]">“{place.reviewTitle}”</p>
        )}
      </div>
    </a>
  );
}
