// 혼자 여행 프리셋에 미리 만들어 두는 테마 코스의 뼈대.
// scripts/build-solo-courses.ts(npm run build:solo)가 이 목록대로 코스를 뽑아
// src/lib/data/soloCourses.json에 얼려 둔다 — 화면은 생성 대기 없이 바로 띄운다.
//
// tags는 src/lib/placeTags.ts의 어휘여야 점수에 반영된다. 테마마다 다른 태그를 주는
// 것만으로는 후보가 겹칠 수 있어(관광지 23곳이 nature다) offset으로 후보 풀을 돌려
// 테마끼리 서로 다른 장소에서 시작하게 한다.

export interface SoloTheme {
  key: string;
  /** 코스 제목. 빌드 때 그대로 쓴다 — 모델이 매번 다른 제목을 붙이지 않도록. */
  title: string;
  /** 이 테마가 어떤 하루인지 한 줄. LLM 프롬프트와 규칙 기반 추천 이유에 쓴다. */
  lead: string;
  tags: string[];
}

export const SOLO_THEMES: SoloTheme[] = [
  {
    key: "water",
    title: "강만 보다 와도 되는 하루",
    lead: "물이 보이는 자리에 오래 앉아 있으려고 고른 코스",
    tags: ["nature", "photo_spot"],
  },
  {
    key: "forest",
    title: "나무 아래서 아무것도 안 하기",
    lead: "숲길과 휴양림을 먼저 골라 천천히 걷는 코스",
    tags: ["nature", "healing"],
  },
  {
    key: "cafe",
    title: "커피 한 잔에 한 시간씩",
    lead: "전망 좋은 카페와 감성적인 공간 위주로 고른 코스",
    tags: ["aesthetic", "view_cafe", "photo_spot"],
  },
  {
    key: "rainy",
    title: "비가 와도 상관없는 하루",
    lead: "실내 공간을 먼저 골라 날씨에 덜 휘둘리는 코스",
    tags: ["indoor", "aesthetic", "experience"],
  },
  {
    key: "local",
    title: "혼자라도 제대로 차려 먹기",
    lead: "양평 향토 음식을 중심에 둔 코스",
    tags: ["local_food", "healing"],
  },
  {
    key: "hands",
    title: "손으로 뭔가 만들고 오는 날",
    lead: "체험과 액티비티를 먼저 골라 하루를 채우는 코스",
    tags: ["experience", "activity"],
  },
];

/** 미리 만들어 두는 일정 길이 — 프리셋 화면의 당일치기/1박 2일 탭과 같다. */
export const SOLO_DURATIONS = [1, 2];

export function soloCourseId(themeKey: string, durationDays: number): string {
  return `solo_${themeKey}_${durationDays}d_curated`;
}
