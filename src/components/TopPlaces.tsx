import Mascot from "@/components/Mascot";
import { TopPlace } from "@/types/travel";

// 네이버 블로그 글이 많은 양평 카페·맛집 세 곳씩. 두 가지 잣대로 줄을 세운다.
//   · 최근 한 달 — 그 기간에 올라온 글 수. 지금 사람들이 가는 곳에 가깝다.
//   · 전체 기간 — 블로그 글 총수. 쌓인 유명세다.
// 순위의 근거를 화면에도 그대로 적는다 — 네이버 플레이스의 방문자 리뷰·별점은 공개
// API로 받을 수 없어 블로그 글 수로 대신한다 (src/lib/api/naverBlogSearch.ts 머리말).

export default function TopPlaces({
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

  return (
    <div className="space-y-6">
      {hasRecent && (
        <div className="space-y-5">
          <Band label={`최근 ${recentDays}일`} note="그 기간에 블로그 글이 가장 많이 올라온 곳" />
          <Group title="카페" places={recentCafe} recentDays={recentDays} />
          <Group title="맛집" places={recentRestaurant} recentDays={recentDays} />
        </div>
      )}

      {hasAllTime && (
        <div className="space-y-5">
          <Band label="전체 기간" note="블로그 글이 가장 많이 쌓인 곳" />
          <Group title="카페" places={cafe} />
          <Group title="맛집" places={restaurant} />
        </div>
      )}

      <p className="text-xs text-[var(--color-subtle)]">
        네이버 블로그 글 수로 줄 세운 순위예요. 플레이스의 방문자 리뷰·별점은 공개 API로 받을 수
        없어 블로그 글 수로 대신합니다.
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

function Group({ title, places, recentDays }: { title: string; places: TopPlace[]; recentDays?: number }) {
  if (places.length === 0) return null;

  return (
    <section>
      <h3 className="mb-2 text-sm font-bold text-[var(--color-primary)]">{title}</h3>
      {/* 한 줄이 1024px까지 늘어나면 오른쪽이 텅 빈다 — 넓은 화면에서는 두 열로 나눈다. */}
      <ul className="grid gap-2 lg:grid-cols-2">
        {places.map((place, index) => (
          <li key={place.placeId}>
            <PlaceRow place={place} rank={index + 1} recentDays={recentDays} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function PlaceRow({ place, rank, recentDays }: { place: TopPlace; rank: number; recentDays?: number }) {
  // "경기도 양평군 서종면 북한강로 1161" → "서종면" — 한 줄에 들어가게 읍·면만 남긴다.
  const area = /양평군\s+(\S+)/.exec(place.address)?.[1] ?? "양평군";
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
              최근 {recentDays}일 블로그 글 {recentCount.toLocaleString("ko-KR")}건
              {place.recentBlogCapped && " 이상"}
              {place.blogReviewCount > 0 && (
                <span className="font-normal text-[var(--color-muted)]">
                  {" "}
                  · 전체 {place.blogReviewCount.toLocaleString("ko-KR")}건
                </span>
              )}
            </>
          ) : (
            <>블로그 리뷰 {place.blogReviewCount.toLocaleString("ko-KR")}건</>
          )}
        </p>
        {place.reviewTitle && (
          <p className="mt-0.5 line-clamp-1 text-[11px] text-[var(--color-subtle)]">“{place.reviewTitle}”</p>
        )}
      </div>
    </a>
  );
}
