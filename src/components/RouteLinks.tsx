"use client";

import { useSyncExternalStore } from "react";
import { LatLng } from "@/lib/geo";
import { naverAppRouteUrl, naverWebRouteUrl, RouteTarget, tmapAppRouteUrl } from "@/lib/mapLinks";

// docs/prd/02-map-realtime-location-prd.md §3 Should — 외부 지도 앱으로 길찾기 연결.
// 앱 딥링크(nmap://, tmap://)는 모바일에서만 열리므로, 모바일에서만 딥링크를 쓰고
// 그 밖에서는 웹 길찾기로 보낸다. 서버 렌더 결과는 항상 웹 URL이라 하이드레이션이 어긋나지 않는다.

const MOBILE_UA = /Android|iPhone|iPad|iPod/i;

// UA는 바뀌지 않으므로 구독할 것이 없다. 서버 스냅샷을 false로 두어 서버와 첫 렌더가
// 같은 웹 URL을 쓰게 하고, 하이드레이션 뒤에 모바일이면 딥링크로 바꾼다.
const neverChanges = () => () => {};

function useIsMobile(): boolean {
  return useSyncExternalStore(
    neverChanges,
    () => MOBILE_UA.test(navigator.userAgent),
    () => false,
  );
}

/** 목록 행에 쓰는 한 줄짜리 길찾기 링크. */
export function RouteLink({ dest, origin, className }: { dest: RouteTarget; origin?: LatLng; className?: string }) {
  const isMobile = useIsMobile();
  const href = isMobile ? naverAppRouteUrl(dest, "car", origin) : naverWebRouteUrl(dest, "car", origin);

  return (
    <a
      href={href}
      target={isMobile ? undefined : "_blank"}
      rel="noreferrer"
      aria-label={`${dest.name}까지 길찾기`}
      className={className}
    >
      길찾기 →
    </a>
  );
}

/** 상세 시트·안내 카드에 쓰는 버튼 묶음. 네이버 지도를 우선하고 티맵을 대안으로 둔다. */
export function RouteButtons({ dest, origin }: { dest: RouteTarget; origin?: LatLng }) {
  const isMobile = useIsMobile();

  return (
    <div className="flex gap-2 text-sm font-semibold">
      <a
        href={isMobile ? naverAppRouteUrl(dest, "car", origin) : naverWebRouteUrl(dest, "car", origin)}
        target={isMobile ? undefined : "_blank"}
        rel="noreferrer"
        className="flex min-h-11 flex-1 items-center justify-center rounded-[var(--radius-button)] bg-[var(--color-primary)] text-white"
      >
        네이버 지도로 길찾기
      </a>
      {isMobile && (
        <a
          href={tmapAppRouteUrl(dest)}
          rel="noreferrer"
          className="flex min-h-11 items-center justify-center rounded-[var(--radius-button)] border border-[var(--color-border)] px-4"
        >
          티맵
        </a>
      )}
    </div>
  );
}
