"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { CATEGORY_LABEL } from "@/lib/categories";
import type { LatLng } from "@/lib/geo";
import type { DetailPlace } from "@/components/PlaceDetailSheet";

// docs/prd/02-map-realtime-location-prd.md 참조.
// 네이버 지도 Dynamic Map SDK(Naver Cloud Platform) 연동.
export interface MapStop {
  lat: number;
  lng: number;
  name: string;
  order: number;
  // 있으면 마커 정보창에 네이버 지도 링크를 붙인다 (상세정보가 없는 지도)
  url?: string;
  // 있으면 마커 정보창에서 "상세보기"로 상세 시트를 열 수 있다 (PRD-02 §3 Must)
  place?: DetailPlace;
}

interface NaverLatLng {
  lat: () => number;
  lng: () => number;
}

interface NaverBounds {
  extend: (point: NaverLatLng) => void;
}

interface NaverMapInstance {
  fitBounds: (bounds: NaverBounds) => void;
  destroy: () => void;
}

interface NaverInfoWindow {
  open: (map: NaverMapInstance, marker: unknown) => void;
  close: () => void;
  setContent: (content: string | HTMLElement) => void;
}

interface NaverMapsNamespace {
  maps: null | {
    Map: new (el: HTMLElement, opts: Record<string, unknown>) => NaverMapInstance;
    LatLng: new (lat: number, lng: number) => NaverLatLng;
    LatLngBounds: new (a: NaverLatLng, b: NaverLatLng) => NaverBounds;
    Marker: new (opts: Record<string, unknown>) => unknown;
    InfoWindow: new (opts: Record<string, unknown>) => NaverInfoWindow;
    Polyline: new (opts: Record<string, unknown>) => unknown;
    Point: new (x: number, y: number) => unknown;
    Event: { addListener: (target: unknown, type: string, handler: () => void) => void };
  };
}

declare global {
  interface Window {
    naver?: NaverMapsNamespace;
  }
}

export default function NaverMapView({
  stops,
  showRoute = true,
  userPosition,
  onSelectPlace,
  heightClass = "h-64 sm:h-96",
}: {
  stops: MapStop[];
  showRoute?: boolean;
  // 화면마다 지도 높이가 다르다 (코스 상세는 모바일에서 화면의 45%).
  heightClass?: string;
  // 현재 위치 — 권한을 받은 뒤에만 들어온다 (PRD-02 §3 Must).
  userPosition?: LatLng | null;
  // 마커 정보창의 "상세보기"에서 호출된다. 지도를 다시 그리지 않도록 호출자가 메모해 넘긴다.
  onSelectPlace?: (place: DetailPlace) => void;
}) {
  const mapElRef = useRef<HTMLDivElement>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_NCP_MAP_CLIENT_ID;

  useEffect(() => {
    // 인증 실패(키·도메인 설정, 네이버 서버 오류) 시 SDK가 naver.maps를 null로 비운다.
    // 그 상태로 다시 그리면 페이지 전체가 깨지므로 지도만 건너뛰고 목록·링크는 살린다.
    if (!sdkReady || !mapElRef.current || !window.naver?.maps || stops.length === 0) return;

    const maps = window.naver.maps;
    const positions = stops.map((s) => new maps.LatLng(s.lat, s.lng));
    const map = new maps.Map(mapElRef.current, {
      center: positions[0],
      zoom: 13,
    });
    // 정보창은 하나만 두고 내용을 갈아 끼운다 — 마커를 차례로 누르면 이전 창이 닫힌다.
    const infoWindow = new maps.InfoWindow({ content: "", borderWidth: 0, disableAnchor: false });

    stops.forEach((stop, i) => {
      const marker = new maps.Marker({
        position: positions[i],
        map,
        title: stop.name,
        icon: {
          content: `<div style="background:#2f6f4f;color:#fff;border-radius:9999px;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;box-shadow:0 1px 4px rgba(0,0,0,.35)">${stop.order}</div>`,
          anchor: new maps.Point(13, 13),
        },
      });
      maps.Event.addListener(marker, "click", () => {
        infoWindow.setContent(previewContent(stop, onSelectPlace));
        infoWindow.open(map, marker);
      });
    });

    if (showRoute && positions.length > 1) {
      new maps.Polyline({
        map,
        path: positions,
        strokeColor: "#2f6f4f",
        strokeWeight: 3,
        strokeOpacity: 0.8,
      });
    }

    const bounded = [...positions];
    if (userPosition) {
      const here = new maps.LatLng(userPosition.lat, userPosition.lng);
      new maps.Marker({
        position: here,
        map,
        title: "현재 위치",
        zIndex: 1000,
        icon: {
          content:
            '<div style="width:18px;height:18px;border-radius:9999px;background:#1a73e8;border:3px solid #fff;box-shadow:0 0 0 4px rgba(26,115,232,.25)"></div>',
          anchor: new maps.Point(9, 9),
        },
      });
      bounded.push(here);
    }

    if (bounded.length > 1) {
      const bounds = new maps.LatLngBounds(bounded[0], bounded[0]);
      bounded.forEach((p) => bounds.extend(p));
      map.fitBounds(bounds);
    }

    return () => {
      infoWindow.close();
      map.destroy();
    };
  }, [sdkReady, stops, showRoute, userPosition, onSelectPlace]);

  if (!clientId) {
    return (
      <div className="flex h-64 items-center justify-center rounded-[var(--radius-card)] border border-dashed border-[var(--color-border)] p-4 text-center text-sm text-[var(--color-muted)]">
        NEXT_PUBLIC_NCP_MAP_CLIENT_ID가 설정되지 않았습니다. .env.local을 확인하세요.
      </div>
    );
  }

  return (
    <>
      <Script
        src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}`}
        strategy="afterInteractive"
        onReady={() => setSdkReady(true)}
      />
      <div ref={mapElRef} className={`w-full overflow-hidden rounded-[var(--radius-card)] ${heightClass}`} />
    </>
  );
}

/**
 * 마커 미리보기 팝업 — 장소명·카테고리와 "상세보기" 버튼 (PRD-02 §3 Must).
 * 문자열 HTML이 아니라 DOM으로 만들어 버튼에 직접 리스너를 건다 (전역 핸들러·HTML 이스케이프 불필요).
 */
function previewContent(stop: MapStop, onSelectPlace?: (place: DetailPlace) => void): HTMLElement {
  const box = document.createElement("div");
  box.style.cssText = "padding:8px 10px;font-size:12px;max-width:200px;line-height:1.4";

  const title = document.createElement("div");
  title.textContent = stop.name;
  title.style.cssText = "font-weight:700";
  box.append(title);

  if (stop.place) {
    const category = document.createElement("div");
    category.textContent = stop.place.categoryLabel ?? CATEGORY_LABEL[stop.place.category];
    category.style.cssText = "color:#6b7280;margin-top:1px";
    box.append(category);
  }

  if (stop.place && onSelectPlace) {
    const place = stop.place;
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "상세보기 →";
    button.setAttribute("aria-haspopup", "dialog");
    button.style.cssText =
      "margin-top:6px;color:#2f6f4f;font-weight:700;background:none;border:0;padding:0;cursor:pointer;font-size:12px";
    button.addEventListener("click", () => onSelectPlace(place));
    box.append(button);
  } else if (stop.url) {
    const link = document.createElement("a");
    link.href = stop.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = "네이버 지도 →";
    link.style.cssText = "display:inline-block;margin-top:6px;color:#2f6f4f;font-weight:700";
    box.append(link);
  }

  return box;
}
