"use client";

import { useState } from "react";
import LocaleLink from "@/components/LocaleLink";
import CourseRouteMap from "@/components/CourseRouteMap";
import FavoriteButton from "@/components/FavoriteButton";
import MascotSpot from "@/components/MascotSpot";
import { cacheCourse } from "@/lib/courseCache";
import PlaceDetailSheet, { DetailPlace } from "@/components/PlaceDetailSheet";
import { Course, ItineraryStop } from "@/types/travel";

// 카드에 바로 보여주는 스팟 수. 나머지는 "+N곳 더 보기"로 펼친다.
const PREVIEW_STOPS = 3;

/** 카드 표지로 쓸 사진. 첫 장소에 없으면(네이버 검색 장소) 사진이 있는 다음 장소를 쓴다. */
function courseCoverPhoto(course: Course): string | undefined {
  return course.days.flatMap((day) => day.stops).find((stop) => stop.photos.length > 0)?.photos[0];
}

export default function CourseCard({ course, wide: wideProp = false }: { course: Course; wide?: boolean }) {
  // 열린 상세 시트의 스팟. null이면 닫힌 상태.
  const [openStop, setOpenStop] = useState<DetailPlace | null>(null);
  const [expanded, setExpanded] = useState(false);
  // 추천 이유는 200자라 카드에서는 세 줄만 보여주고 눌러서 펼친다.
  const [reasonOpen, setReasonOpen] = useState(false);

  const allStops = course.days.flatMap((day) => day.stops.map((stop) => ({ stop, day: day.day })));
  const visibleStops = expanded ? allStops : allStops.slice(0, PREVIEW_STOPS);
  const hiddenCount = allStops.length - visibleStops.length;
  const coverPhoto = courseCoverPhoto(course);
  const wide = wideProp;
  const multiDay = course.days.length > 1;
  const departure = course.days[0]?.departure;
  const arrival = course.days[course.days.length - 1]?.arrival;

  // wide는 목록에 코스가 하나뿐일 때 켜진다 (CourseResults). 넓은 화면에서 카드를
  // 두 단으로 갈라 — 왼쪽 사진·소개, 오른쪽 일정·동선 — 가로폭을 쓴다. 한 장을 그냥
  // 가운데로 모으기만 하면 제목은 왼쪽 끝인데 카드만 가운데라 왼쪽 아래가 비어 어색했다.
  //
  // lg 미만에서는 wide가 켜져도 지금까지와 똑같이 한 줄로 쌓인다. 그래서 여백도
  // 위/아래로 나눠 둔다 — 좁은 화면에서 두 묶음이 이어 붙어 전처럼 p-4 한 덩이가 된다.
  return (
    <div
      className={`surface-card lift relative overflow-hidden${
        wide ? " lg:grid lg:grid-cols-2" : ""
      }`}
    >
      {/* 사진 + 소개 */}
      <div className="relative lg:flex lg:flex-col">
        {coverPhoto ? (
          // 넓은 화면에서는 사진이 남는 높이를 채운다. 사진에 직접 flex-1을 주면
          // 높이가 auto라 원본 비율대로 416px까지 자라, 오른쪽 단(일정) 아래가
          // 그만큼 비었다. 늘어나는 역할은 비율이 없는 상자가 맡고 사진은 그 안을
          // 덮는다 — 남는 높이에 맞춰 잘릴 뿐 카드 길이를 끌고 가지 않는다.
          <div className={wide ? "relative lg:min-h-48 lg:flex-1" : undefined}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverPhoto}
              alt={course.title}
              loading="lazy"
              className={`w-full object-cover ${
                wide ? "h-40 lg:absolute lg:inset-0 lg:h-full" : "h-40"
              }`}
            />
          </div>
        ) : (
          // 표지로 쓸 사진이 한 장도 없는 코스(열여섯 유형 중 셋)가 있다. 두 단을
          // 포기하면 그 화면만 좁은 카드가 되어 바로 아래 숙소 카드와 폭이 어긋나므로,
          // 빈 칸 대신 평안이를 세운다 — 사진 없는 장소에 쓰는 처리와 같다(TopPlaces).
          // 좁은 화면에서는 전처럼 아무것도 두지 않는다.
          wide && (
            <div className="hidden items-center justify-center bg-[var(--color-character-blue)]/10 lg:flex lg:min-h-48 lg:flex-1">
              <MascotSpot expression="smile" size={72} />
            </div>
          )
        )}
        <div className="absolute right-3 top-3">
          <FavoriteButton course={course} />
        </div>
        <div className={`px-4 pt-4${wide ? " lg:pb-4" : ""}`}>
        {course.source && (
          <span
            className={`mb-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
              course.source === "curated"
                ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                : "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
            }`}
          >
            {course.source === "curated" ? "추천 코스" : "AI 추천"}
          </span>
        )}
        <h3 className="display mb-1 text-[17px] leading-snug">
          {/* 코스는 서버에 저장되지 않으므로, 상세 화면이 읽을 수 있게 담아 두고 이동한다. */}
          <LocaleLink href={`/course/detail/${course.courseId}`} onClick={() => cacheCourse(course)}>
            {course.title}
          </LocaleLink>
        </h3>
        <p className="mb-2 text-xs text-[var(--color-muted)]">{course.days.length}일 코스</p>
        {/* 서울에서 출발하는 사람 기준 (src/lib/agents/schedule.ts). 찜해 둔 옛 코스에는
            아직 없을 수 있어 있을 때만 보여준다. */}
        {departure && (
          <p className="mb-3 text-xs font-semibold text-[var(--color-accent)]">
            🚗 {departure.at} {departure.place} 출발{arrival && ` · ${arrival.at} 복귀`}
          </p>
        )}
        {/* 왜 이 코스인지 (src/lib/agents/courseReason.ts) */}
        {course.reason && (
          <button
            type="button"
            onClick={() => setReasonOpen((open) => !open)}
            aria-expanded={reasonOpen}
            className="mb-3 block w-full rounded-xl bg-[var(--color-character-ivory)] px-2.5 py-2 text-left text-xs leading-relaxed text-[var(--color-muted)]"
          >
            <span aria-hidden className="mr-1">💧</span>
            <span className={reasonOpen ? "" : "line-clamp-2"}>{course.reason}</span>
            <span className="mt-1 block font-semibold text-[var(--color-primary)]">
              {reasonOpen ? "접기" : "추천 이유 보기"}
            </span>
          </button>
        )}
        {course.notice && (
          // 검증 에이전트가 대체 후보를 찾지 못해 남긴 주의사항
          // (docs/agents/04-validation-agent.md "실패/재시도 처리")
          <p className="notice mb-3 rounded-xl px-2.5 py-2 text-xs">⚠️ {course.notice}</p>
        )}
        </div>
      </div>

      {/* 일정 · 동선 · 상세로 가는 길 */}
      <div
        className={`px-4 pb-4${
          wide ? " lg:border-l lg:border-[var(--color-border)] lg:pt-4" : ""
        }`}
      >
        <ul className="space-y-1 text-sm">
          {visibleStops.map(({ stop, day }) => (
            <li key={stop.placeId}>
              <StopButton stop={stop} day={multiDay ? day : undefined} onOpen={() => setOpenStop(stop)} />
            </li>
          ))}
        </ul>
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="mt-2 text-xs font-semibold text-[var(--color-primary)]"
          >
            +{hiddenCount}곳 더 보기
          </button>
        )}

        {/* 코스 전체 동선을 작은 지도에 선으로 이어 보여준다 */}
        <CourseRouteMap course={course} />

        <LocaleLink
          href={`/course/detail/${course.courseId}`}
          onClick={() => cacheCourse(course)}
          className="mt-3 flex min-h-11 items-center justify-center rounded-[var(--radius-button)] border border-[var(--color-primary)] text-sm font-bold text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10"
        >
          지도로 코스 보기 →
        </LocaleLink>
      </div>

      {openStop && <PlaceDetailSheet place={openStop} onClose={() => setOpenStop(null)} />}
    </div>
  );
}

// 스팟 한 줄 — 누르면 상세 시트가 열린다 (PRD-03 §4).
function StopButton({ stop, day, onOpen }: { stop: ItineraryStop; day?: number; onOpen: () => void }) {
  const summary = stop.reason ?? stop.reviewSummary;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-label={`${stop.name} 상세정보 보기`}
      className="-mx-1 block w-full rounded-lg px-1 py-1 text-left hover:bg-[var(--color-primary)]/5"
    >
      <span className="flex items-center gap-2">
        {day != null && (
          <span className="shrink-0 rounded-full bg-[var(--color-primary)]/10 px-1.5 text-xs font-medium text-[var(--color-primary)]">
            {day}일차
          </span>
        )}
        <span className="shrink-0 text-[var(--color-muted)]">{stop.timeSlot}</span>
        <span className="min-w-0 truncate">{stop.name}</span>
      </span>
      {summary && <span className="line-clamp-1 text-xs text-[var(--color-muted)]">{summary}</span>}
    </button>
  );
}
