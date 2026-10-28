"use client";

import { useEffect, useState } from "react";
import { loadPlaceReviews } from "@/lib/actions";
import type { PlaceReviews as PlaceReviewsData } from "@/lib/api/naverBlogSearch";

// PRD-03 §3의 "리뷰" 항목. 네이버는 플레이스 방문자 리뷰·별점을 공개 API로 주지 않아
// 공식 API로 받을 수 있는 블로그 리뷰를 보여준다 (src/lib/api/naverBlogSearch.ts).
// 어디서 온 글인지 헷갈리지 않게 제목에 "블로그 리뷰"라고 적는다.
export default function PlaceReviews({ placeName }: { placeName: string }) {
  // "loading" → 받는 중, null → 리뷰가 없거나 받지 못함(영역째 접는다).
  // 장소가 바뀌면 호출부가 key로 다시 마운트하므로 여기서 "loading"으로 되돌리지
  // 않는다 — 이펙트 안에서 바로 setState하면 렌더가 한 번 더 돈다.
  const [state, setState] = useState<"loading" | PlaceReviewsData | null>("loading");

  useEffect(() => {
    let alive = true;
    loadPlaceReviews(placeName).then(
      (data) => alive && setState(data),
      () => alive && setState(null),
    );
    return () => {
      alive = false;
    };
  }, [placeName]);

  if (state === null) return null;

  if (state === "loading") {
    return (
      <div className="mt-4" role="status" aria-label="네이버 블로그 리뷰를 찾고 있어요">
        <div className="skeleton-line h-4 w-32 rounded-full" />
        <div className="mt-3 space-y-3" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i}>
              <div className="skeleton-line h-3.5 w-3/4 rounded-full" />
              <div className="skeleton-line mt-1.5 h-3 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="mt-4">
      <h3 className="text-sm font-semibold">
        네이버 블로그 리뷰
        <span className="ml-1.5 font-normal text-[var(--color-muted)]">
          {state.total.toLocaleString("ko-KR")}건
        </span>
      </h3>
      <ul className="mt-2 space-y-2">
        {state.reviews.map((review) => (
          <li key={review.link}>
            <a
              href={review.link}
              target="_blank"
              rel="noreferrer"
              className="block rounded-[var(--radius-card)] border border-[var(--color-border)] p-3 transition hover:border-[var(--color-primary)]"
            >
              <p className="text-sm font-medium">{review.title}</p>
              {review.excerpt && (
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--color-muted)]">
                  {review.excerpt}
                </p>
              )}
              <p className="mt-1.5 text-xs text-[var(--color-muted)]">
                {[review.blogger, review.date].filter(Boolean).join(" · ")}
              </p>
            </a>
          </li>
        ))}
      </ul>
      <a
        href={state.searchUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-2 flex min-h-11 items-center justify-center rounded-[var(--radius-button)] border border-[var(--color-border)] text-sm font-semibold"
      >
        네이버에서 리뷰 더 보기
      </a>
    </section>
  );
}
