"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import NaverMapView, { MapStop } from "@/components/NaverMapView";
import { distanceKm, formatDistance } from "@/lib/geo";
import { Course } from "@/types/travel";

// 코스 카드에 들어가는 작은 동선 지도 — 스팟을 번호 순서대로 선으로 이어 보여준다.
// 누르거나 끌 수 없는 그림이라(NaverMapView interactive=false), 목록을 넘기다 손가락이
// 지도에 걸리지 않는다. 자세히 보려면 카드의 "지도로 코스 보기"로 들어간다.
//
// 목록에 카드가 여섯 장 깔리므로 지도를 한꺼번에 여섯 개 띄우지 않는다 — 화면에
// 들어올 때 비로소 SDK 지도를 만든다.

export default function CourseRouteMap({ course }: { course: Course }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  const stops = useMemo(() => course.days.flatMap((day) => day.stops), [course]);
  const mapStops = useMemo<MapStop[]>(
    () => stops.map((stop, i) => ({ lat: stop.lat, lng: stop.lng, name: stop.name, order: i + 1 })),
    [stops],
  );
  // 스팟 사이 직선거리 합 — 주행거리가 아니라 동선의 규모를 가늠하는 값이다.
  const totalKm = useMemo(
    () => stops.slice(1).reduce((sum, stop, i) => sum + distanceKm(stops[i], stop), 0),
    [stops],
  );

  useEffect(() => {
    const box = boxRef.current;
    if (!box || visible) return;
    // IntersectionObserver가 없는 환경에서는 그냥 바로 그린다. (서버 렌더와 어긋나지
    // 않게 초기값은 false로 두고, 효과 본문 바깥에서 한 박자 뒤에 올린다.)
    if (typeof IntersectionObserver === "undefined") {
      queueMicrotask(() => setVisible(true));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setVisible(true);
      },
      { rootMargin: "200px" },
    );
    observer.observe(box);
    return () => observer.disconnect();
  }, [visible]);

  if (stops.length < 2) return null;

  return (
    <div ref={boxRef} className="mt-3">
      {visible ? (
        <NaverMapView stops={mapStops} heightClass="h-32" interactive={false} />
      ) : (
        <div className="h-32 w-full rounded-[var(--radius-card)] bg-[var(--color-character-ivory)]" />
      )}
      <p className="mt-1 text-center text-[11px] text-[var(--color-subtle)]">
        {stops.length}곳을 차례로 이은 동선
        {totalKm > 0 && ` · 전체 ${formatDistance(totalKm)}(직선거리)`}
      </p>
    </div>
  );
}
