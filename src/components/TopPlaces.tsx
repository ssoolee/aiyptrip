import Mascot from "@/components/Mascot";
import { TopPlace } from "@/types/travel";

// 네이버에서 "양평 추천 맛집 / 양평 추천 카페"를 검색했을 때 블로그 글이 가장 많은
// 세 곳씩. 순위의 근거는 블로그 글 수라 화면에도 그대로 "블로그 리뷰 N건"으로 적는다
// — 네이버 플레이스의 방문자 리뷰·별점은 공개 API로 받을 수 없다
// (src/lib/api/naverBlogSearch.ts 머리말).

export default function TopPlaces({ cafe, restaurant }: { cafe: TopPlace[]; restaurant: TopPlace[] }) {
  if (cafe.length === 0 && restaurant.length === 0) return null;

  return (
    <div className="space-y-5">
      <Group title="카페" places={cafe} />
      <Group title="맛집" places={restaurant} />
      <p className="text-xs text-[var(--color-subtle)]">
        네이버 지역 검색 결과를 네이버 블로그 글 수로 다시 줄 세운 순위예요. 플레이스의 방문자
        리뷰·별점은 공개 API로 받을 수 없어 블로그 글 수로 대신합니다.
      </p>
    </div>
  );
}

function Group({ title, places }: { title: string; places: TopPlace[] }) {
  if (places.length === 0) return null;

  return (
    <section>
      <h3 className="mb-2 text-sm font-bold text-[var(--color-primary)]">{title}</h3>
      <ul className="space-y-2">
        {places.map((place, index) => (
          <li key={place.placeId}>
            <PlaceRow place={place} rank={index + 1} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function PlaceRow({ place, rank }: { place: TopPlace; rank: number }) {
  // "경기도 양평군 서종면 북한강로 1161" → "서종면" — 한 줄에 들어가게 읍·면만 남긴다.
  const area = /양평군\s+(\S+)/.exec(place.address)?.[1] ?? "양평군";

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
          블로그 리뷰 {place.blogReviewCount.toLocaleString("ko-KR")}건
        </p>
        {place.reviewTitle && (
          <p className="mt-0.5 line-clamp-1 text-[11px] text-[var(--color-subtle)]">“{place.reviewTitle}”</p>
        )}
      </div>
    </a>
  );
}
