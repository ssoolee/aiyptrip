import { ItineraryDay } from "@/types/travel";

// 방문 장소 구성이 같으면 같은 코스로 본다. 서버(orchestrator)와
// 클라이언트("더 보기" 중복 제거) 양쪽에서 쓰므로 서버 전용 의존성을 두지 않는다.
export function courseSignature(days: ItineraryDay[]): string {
  return days
    .flatMap((d) => d.stops.map((s) => s.placeId))
    .sort()
    .join("|");
}
