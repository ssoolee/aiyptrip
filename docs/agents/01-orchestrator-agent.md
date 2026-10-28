# 1. 오케스트레이터(총괄 플래너) 에이전트

## 역할/책임

사용자의 자연어 여행 요청을 구조화된 조건으로 변환하고, 나머지 4개
에이전트(장소 검색 → 코스 플래닝 → 검증 → 콘텐츠 보강)를 순서대로
호출하는 워크플로우를 총괄한다. 대화형 수정 요청("카페만 바꿔줘" 등)이
들어오면 전체를 처음부터 다시 하지 않고 관련된 하위 에이전트만
부분 재호출한다. 서비스의 진입점(entry point) 역할을 한다.

## 입력 스키마

```json
{
  "user_message": "이번 주말 1박2일, 커플 여행, 감성 카페 위주, 차 없이 대중교통, 두물머리 근처에서 시작",
  "conversation_history": [],
  "user_geolocation": { "lat": 37.5326, "lng": 127.325 }
}
```

## 출력 스키마

```json
{
  "trip_conditions": {
    "duration_days": 2,
    "party": "couple",
    "preferences": ["cafe_aesthetic"],
    "transport": "public_transit",
    "start_location": "두물머리",
    "budget": null
  },
  "final_response": { "...": "5번 에이전트의 최종 출력을 그대로 전달" }
}
```

## 사용 가능한 Tool/외부 API

- 없음 (직접 외부 API를 호출하지 않고, 하위 에이전트를 호출하는 조정자 역할)
- 내부 함수 호출: `callPlaceRetrievalAgent()`, `callItineraryComposerAgent()`,
  `callValidationAgent()`, `callEnrichmentAgent()`

## System Prompt 초안

```
당신은 양평군 여행 코스 추천 서비스의 요청 분석 및 워크플로우 총괄
에이전트입니다. 사용자의 자연어 요청을 아래 JSON 스키마로 구조화하세요.

- duration_days: 여행 일수 (숫자, 명시 없으면 1)
- party: 동행 형태 (solo/couple/family/friends 중 하나, 추정)
- preferences: 취향 태그 배열 (예: cafe_aesthetic, nature, activity, quiet)
- transport: 이동수단 (car/public_transit, 명시 없으면 public_transit)
- start_location: 출발/기준 지점 (양평군 내 지명, 없으면 null)
- budget: 예산 (원 단위 숫자, 없으면 null)

불명확한 값은 추측하되 과도한 가정을 하지 말고 null로 남기세요.
출력은 JSON만 반환하세요.
```

## 다른 에이전트와의 관계

- 모든 요청의 시작점이며, 2→3→4→5 순서로 호출한다.
- 4번(검증) 에이전트가 "재검색 필요"를 반환하면 2번을 다시 호출한다.
- 사용자의 후속 수정 요청은 변경이 필요한 범위만 판단해 해당 단계부터
  재호출한다 (예: "카페만 바꿔줘" → 2, 3, 4, 5번만 재실행, 1번의
  구조화 결과 중 preferences만 갱신).

## 실패/재시도 처리

- 하위 에이전트 호출 실패(API 오류, 타임아웃) 시 최대 2회 재시도 후
  사용자에게 "일부 정보를 가져오지 못했다"는 메시지와 함께 부분 결과 제공.
- 사용자 요청이 지나치게 모호한 경우(예: 지역 정보 전혀 없음) 되묻는
  응답을 생성해 사용자에게 반환한다.
