import curation from "@/lib/data/mbtiCourses.json";
import { rehydrateCourse, withFreshFacts } from "@/lib/curation";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { Course, LodgingPick } from "@/types/travel";

// docs/prd/01-ai-course-recommendation-prd.md §3.1 MBTI-취향 매핑표
// "더 보기"로 추가 생성하는 코스(에이전트 파이프라인)의 취향 태그로 쓴다.
const MBTI_TAG_MAP: Record<string, string[]> = {
  E: ["activity", "lively_food", "group"],
  I: ["quiet_cafe", "nature", "healing"],
  S: ["local_food", "experience"],
  N: ["aesthetic", "photo_spot"],
  T: ["experience"],
  F: ["aesthetic", "romantic"],
  J: ["experience"],
  P: ["nature", "quiet_cafe"],
};

export function tagsForMbti(mbti?: string): string[] {
  if (!mbti) return ["nature", "aesthetic"];
  const letters = mbti.toUpperCase().split("").filter((c) => c in MBTI_TAG_MAP);
  const tags = new Set<string>();
  for (const letter of letters) {
    for (const tag of MBTI_TAG_MAP[letter]) tags.add(tag);
  }
  return tags.size > 0 ? Array.from(tags) : ["nature", "aesthetic"];
}

// 16유형을 흔히 쓰는 4개 기질 그룹으로 묶어 버튼 화면에 보여준다.
// 그룹 이름은 언어마다 다르므로 사전(mbti.groups)이 갖는다 — 여기 남는 건 묶음뿐이다.
export type MbtiGroupKey = "analyst" | "diplomat" | "sentinel" | "explorer";

/**
 * 열여섯 유형. 사전의 직업 표에서 뽑는다 — 유형을 하나 빠뜨리거나 오타를 내면
 * 사전과 어긋나는 순간 타입에서 걸린다.
 */
export type MbtiType = keyof Dictionary["mbti"]["jobs"];

export const MBTI_GROUPS: { key: MbtiGroupKey; types: MbtiType[] }[] = [
  { key: "analyst", types: ["INTJ", "INTP", "ENTJ", "ENTP"] },
  { key: "diplomat", types: ["INFJ", "INFP", "ENFJ", "ENFP"] },
  { key: "sentinel", types: ["ISTJ", "ISFJ", "ESTJ", "ESFJ"] },
  { key: "explorer", types: ["ISTP", "ISFP", "ESTP", "ESFP"] },
];

export const MBTI_TYPES = MBTI_GROUPS.flatMap((g) => g.types);

/**
 * 유형마다 하나씩 있는 '직업 평안이' 그림과 그 직업 이름 (public/character/mbti/).
 * 평안이 캐릭터 시트와 같은 그림체로 그린 16컷 도감 한 장을 유형별로 잘라, 배경과
 * 글자를 걷어내고 같은 배율·같은 바닥선으로 맞춘 것이다. 글자를 그림에 남기지 않은
 * 것은 다크모드와 글꼴을 화면 쪽에서 쥐기 위해서다 — 직업 이름은 아래 표로 적는다.
 *
 * 그림은 전부 280x210이라 화면에서 width/height를 하나로 쓸 수 있다.
 */
export const MBTI_ART_WIDTH = 280;
export const MBTI_ART_HEIGHT = 210;

export const MBTI_JOBS: Record<string, string> = {
  INTJ: "건축가",
  INTP: "과학자",
  ENTJ: "기업가",
  ENTP: "발명가",
  INFJ: "상담가",
  INFP: "작가",
  ENFJ: "교사",
  ENFP: "여행 기획자",
  ISTJ: "회계사",
  ISFJ: "간호사",
  ESTJ: "현장 관리자",
  ESFJ: "요리사",
  ISTP: "정비사",
  ISFP: "화가",
  ESTP: "소방관",
  ESFP: "가수",
};

/** 유형 그림의 경로. 열여섯 유형 모두 파일이 있다. */
export function mbtiArtSrc(type: string): string {
  return `/character/mbti/${type}.png`;
}

export function isMbtiType(value: string): value is MbtiType {
  return (MBTI_TYPES as string[]).includes(value);
}

export interface MbtiCuration {
  summary?: string;
  courses: Course[];
  lodging: LodgingPick[];
}

// 큐레이션 코스의 courseId는 "mbti_ISTJ_curated_1"처럼 고정이라, 코스 상세 화면이
// URL만으로 다시 찾을 수 있다 (파이프라인 코스는 요청마다 새로 만들어져 불가능 —
// src/lib/courseCache.ts 참조).
const CURATED_COURSE_ID = /^mbti_([A-Z]{4})_curated_\d+$/;

export function findCuratedCourse(courseId: string, noticeTemplate?: string): Course | undefined {
  const match = CURATED_COURSE_ID.exec(courseId);
  if (!match) return undefined;
  return getMbtiCuration(match[1], noticeTemplate).courses.find(
    (course) => course.courseId === courseId,
  );
}

// scripts/build-mbti-courses.ts(npm run build:mbti)가 만든 유형별 큐레이션 코스.
// 해당 유형 자료가 아직 없으면 빈 값 — 화면은 자동 생성 코스로 대체한다.
export function getMbtiCuration(type: string, noticeTemplate?: string): MbtiCuration {
  const entry = (curation.types as Record<string, Partial<MbtiCuration>>)[type];
  return {
    summary: entry?.summary,
    // 장소와 순서만 사람이 고른 것이라, 시각은 파이프라인 코스와 같은 기준
    // (서울 09:00 출발 + 이동·체류시간)으로 다시 계산한다 — src/lib/curation.ts.
    // map(rehydrateCourse)로 넘기면 두 번째 인자로 **index가 들어간다** — 주의 문구
    // 틀 자리에 0이 박힌다. 화살표로 감싸 한 인자만 넘긴다.
    courses: (entry?.courses ?? []).map((course) => rehydrateCourse(course, noticeTemplate)),
    lodging: (entry?.lodging ?? []).map((pick) => withFreshFacts<LodgingPick>(pick)),
  };
}
