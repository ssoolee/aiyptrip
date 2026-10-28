# 2. 장소 검색·추천 에이전트 (Place Retrieval Agent)

## 역할/책임

구조화된 여행 조건과 카테고리(맛집/카페/관광지/숙소)를 입력받아, 외부
장소 API(네이버 검색 API(지역 검색), TourAPI) 또는 자체 캐시 DB에서 후보 장소를
검색하고, 사용자 취향에 맞게 1차 필터링/재정렬한다. 맛집·카페·관광지·
숙소를 각각 별도 에이전트로 만들지 않고, 이 하나의 에이전트가 카테고리
파라미터로 모두 처리한다.

## 입력 스키마

```json
{
  "trip_conditions": {
    "duration_days": 2,
    "preferences": ["cafe_aesthetic"],
    "start_location": "두물머리"
  },
  "category": "cafe",
  "exclude_place_ids": ["nvr_123456"],
  "count": 10
}
```

- `category`: `restaurant` | `cafe` | `attraction` | `lodging`
- `exclude_place_ids`: 검증 에이전트가 부적합 판정한 장소 재검색 시 제외 목록

## 출력 스키마

```json
{
  "category": "cafe",
  "candidates": [
    {
      "place_id": "nvr_789012",
      "name": "두물머리 뷰 카페",
      "category": "cafe",
      "lat": 37.5341,
      "lng": 127.3198,
      "address": "경기 양평군 양서면 …",
      "phone": "031-000-0000",
      "rating": 4.5,
      "business_hours_raw": "매일 10:00-20:00, 화요일 휴무",
      "distance_from_start_km": 1.2,
      "tags": ["view", "aesthetic"]
    }
  ]
}
```

## 사용 가능한 Tool/외부 API

- **네이버 검색 API (지역 검색, `local.json`)** — 상호명, 주소, 전화번호,
  카테고리, 블로그/카페 언급량 기반 "인기도" 신호. 좌표는 TM128(KATEC)로
  반환되므로 위경도(WGS84) 변환 후 사용
- **한국관광공사 TourAPI** — 관광지/숙소 상세정보, 사진, 소개글
- **자체 캐시 DB 조회 함수** `searchCachedPlaces(category, region)` —
  API 우선 대신 캐시 우선 조회 (없으면 외부 API 폴백)

## System Prompt 초안

```
당신은 양평군 지역 장소 검색 전문 에이전트입니다. 주어진 카테고리와
여행 조건(취향, 출발 지점)에 맞춰 도구를 호출해 후보 장소를 수집하고,
아래 기준으로 상위 {count}개를 선별해 반환하세요.

우선순위: (1) preferences 태그와의 일치도, (2) 평점, (3) 출발 지점과의
거리. exclude_place_ids에 있는 장소는 후보에서 제외하세요.
도구 호출 결과의 raw 데이터를 스키마에 맞게 정리해 JSON으로만 응답하세요.
```

## 다른 에이전트와의 관계

- 1번(오케스트레이터)에 의해 카테고리별로 최대 4회 호출됨(맛집/카페/
  관광지/숙소 각 1회, 또는 필요 카테고리만).
- 3번(코스 플래닝)에게 후보 리스트를 전달.
- 4번(검증)에서 재검색 요청이 오면 `exclude_place_ids`를 갱신해 재호출됨.

## 실패/재시도 처리

- 외부 API 오류 시 캐시 DB로 폴백, 캐시도 없으면 빈 배열 반환 + 오류
  플래그를 오케스트레이터에 전달.
- 후보가 `count`보다 적게 나오면 취향 필터를 완화해 1회 재검색.
