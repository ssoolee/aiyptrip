"use server";

import { searchBlogReviews, type PlaceReviews } from "@/lib/api/naverBlogSearch";
import { generateCourses } from "@/lib/agents/orchestrator";
import { interpretRequest } from "@/lib/agents/requestInterpreter";
import { Course, PresetType } from "@/types/travel";

// 화면에 이미 있는 장소를 몇 개까지 받아 줄지. 코스 한 장이 최대 9곳이라 넉넉히 잡되,
// 서버 액션은 외부에서 그대로 부를 수 있는 입구라 상한을 둔다.
const MAX_SHOWN_PLACES = 200;

// docs/prd/01-ai-course-recommendation-prd.md §4.2 "실시간 추가 생성"에 대응.
// 지금은 서버 액션으로 직접 호출하지만, Firebase 전환 시 HTTPS Callable
// Function 엔드포인트로 옮겨질 로직 (docs/prd/06-infra-deployment-prd.md §5).
export async function loadMoreCourses(
  presetType: PresetType,
  offsetStart: number,
  mbti?: string,
  query?: string,
  durationDays?: number,
  // 지금 화면에 있는 코스들의 장소. 같은 곳을 또 추천하지 않도록 제외한다.
  shownPlaces?: { placeId: string; name: string }[],
): Promise<Course[]> {
  // 자연어 요청은 해석 결과가 캐시되어 있어 "더 보기"마다 LLM을 다시 부르지 않는다.
  const conditions = presetType === "custom" && query ? await interpretRequest(query) : undefined;
  const excludePlaces = (shownPlaces ?? [])
    .slice(0, MAX_SHOWN_PLACES)
    .map((p) => ({ placeId: String(p.placeId).slice(0, 80), name: String(p.name).slice(0, 60) }));
  return await generateCourses({
    presetType,
    offsetStart,
    count: 3,
    mbti,
    conditions,
    durationDays,
    excludePlaces,
  });
}

// 장소 상세 시트(PlaceDetailSheet)가 열릴 때만 네이버 블로그 리뷰를 가져온다.
// 코스 추천 응답에 실어 보내면 장소마다 호출이 붙어 추천이 느려지고, 열어 보지도
// 않은 장소의 리뷰까지 받게 된다. 실패·미설정은 null이고 시트는 영역을 접는다.
export async function loadPlaceReviews(placeName: string): Promise<PlaceReviews | null> {
  // 서버 액션은 외부에서 그대로 호출할 수 있는 입구라, 검색어 길이를 잘라 둔다.
  return await searchBlogReviews(placeName.slice(0, 60));
}
