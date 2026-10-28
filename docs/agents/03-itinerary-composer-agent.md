# 3. 코스 플래닝(동선 최적화) 에이전트 (Itinerary Composer Agent)

## 역할/책임

카테고리별 후보 장소 리스트를 받아, 일정(며칠, 하루 몇 곳)과 이동수단을
고려해 지리적으로 자연스러운 동선의 Day1/Day2… 코스를 구성한다. 실제
거리/이동시간 계산은 LLM이 직접 하지 않고 지도 API 도구를 호출해
받아오며, LLM은 "어떤 조합이 자연스러운 여행 흐름인지"(아침-관광,
점심-맛집, 오후-카페, 저녁-맛집, 숙소 순서 등) 판단만 담당한다.

## 입력 스키마

```json
{
  "trip_conditions": { "duration_days": 2, "transport": "public_transit" },
  "candidates_by_category": {
    "cafe": ["...02번 에이전트 출력..."],
    "restaurant": ["..."],
    "attraction": ["..."],
    "lodging": ["..."]
  }
}
```

## 출력 스키마

```json
{
  "itinerary": [
    {
      "day": 1,
      "stops": [
        { "time_slot": "14:00-15:00", "place_id": "nvr_789012", "category": "cafe" },
        { "time_slot": "15:30-17:00", "place_id": "nvr_111", "category": "attraction" },
        { "time_slot": "18:00-19:30", "place_id": "nvr_222", "category": "restaurant" },
        { "time_slot": "20:00", "place_id": "nvr_333", "category": "lodging" }
      ]
    },
    { "day": 2, "stops": [ "..." ] }
  ]
}
```

## 사용 가능한 Tool/외부 API

- **네이버 지도 Directions 5 API (Naver Cloud Platform)** — 두 지점 간
  자동차 이동시간·거리 계산
- **ODsay 대중교통 길찾기 API** — 대중교통(버스/지하철) 이동시간 계산
  (네이버는 대중교통 길찾기 API를 제공하지 않아 별도 연동 필요,
  `07-external-api-integration.md` 참조)
- 내부 함수 `estimateTravelTime(from, to, mode)`

## System Prompt 초안

```
당신은 여행 동선 설계 전문 에이전트입니다. 카테고리별 후보 장소 중에서
하루 일정에 맞게 장소를 선택하고 방문 순서/시간대를 배정하세요.

규칙:
- 하루에 숙소 1곳(마지막), 식사(맛집) 1~2회, 카페/관광지는 취향에 따라
  배분합니다.
- 인접한 장소끼리 묶어 이동 거리를 최소화하세요. 실제 이동시간은
  제공된 도구로 조회한 값을 사용하고 임의로 추정하지 마세요.
- 마지막 날은 숙소를 포함하지 않습니다(체크아웃 후 일정만 구성).
출력은 JSON만 반환하세요.
```

## 다른 에이전트와의 관계

- 2번(장소 검색)의 출력을 입력으로 받음.
- 4번(검증)에게 초안 코스를 전달하고, 검증 실패 시 4번의 피드백(부적합
  장소 및 사유)을 받아 대체 장소로 재구성.

## 실패/재시도 처리

- 특정 시간대에 배정 가능한 후보가 없으면(예: 카페 후보 소진) 해당
  슬롯을 비우고 오케스트레이터에 "후보 부족" 플래그 전달 → 2번 에이전트
  재호출 트리거.
