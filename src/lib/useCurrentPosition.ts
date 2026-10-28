"use client";

import { useCallback, useState } from "react";
import { LatLng } from "@/lib/geo";

// docs/prd/02-map-realtime-location-prd.md §4 — 위치 권한은 화면 진입 즉시 묻지 않고
// 사용자가 "내 위치" 같은 명확한 행동을 했을 때만 요청한다. 권한을 거부해도 지도·동선은
// 그대로 보여야 하므로, 실패는 화면에 적을 문장으로만 돌려준다.
// §6 — 좌표는 이 세션에서만 쓰고 저장하지 않는다.

const TIMEOUT_MS = 10_000;

export interface CurrentPositionState {
  position: LatLng | null;
  error: string | null;
  loading: boolean;
  /** 위치 권한을 요청하고 좌표를 받아 온다. */
  request: () => void;
}

export function useCurrentPosition(): CurrentPositionState {
  const [position, setPosition] = useState<LatLng | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const request = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("이 브라우저에서는 현재 위치를 쓸 수 없어요.");
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (result) => {
        setPosition({ lat: result.coords.latitude, lng: result.coords.longitude });
        setLoading(false);
      },
      (failure) => {
        setError(messageFor(failure));
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: TIMEOUT_MS, maximumAge: 60_000 },
    );
  }, []);

  return { position, error, loading, request };
}

function messageFor(failure: GeolocationPositionError): string {
  switch (failure.code) {
    case failure.PERMISSION_DENIED:
      return "위치 권한이 거부됐어요. 브라우저 주소창의 자물쇠 아이콘에서 허용할 수 있어요.";
    case failure.POSITION_UNAVAILABLE:
      return "현재 위치를 찾지 못했어요. 잠시 후 다시 시도해 주세요.";
    case failure.TIMEOUT:
      return "위치를 찾는 데 너무 오래 걸렸어요. 다시 시도해 주세요.";
    default:
      return "현재 위치를 가져오지 못했어요.";
  }
}
