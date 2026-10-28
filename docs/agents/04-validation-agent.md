# 4. 검증(현실성 체크) 에이전트 (Validation Agent)

## 역할/책임

구성된 코스가 실제로 실행 가능한지 재검증한다. 영업시간·정기휴무일·
실시간 혼잡도·이동 소요시간이 코스 상 배정된 시간대와 맞는지 확인하고,
문제가 있는 스탑(stop)이 있으면 사유와 함께 반려하여 재구성을 요청한다.
LLM 판단(자연어 영업시간 해석 등)과 룰 기반 체크(시간 비교, 거리 계산)를
함께 사용한다.

## 입력 스키마

```json
{
  "itinerary": [ "...03번 에이전트 출력..." ],
  "places_detail": { "nvr_789012": { "business_hours_raw": "매일 10:00-20:00, 화요일 휴무" } },
  "target_date": "2026-09-19"
}
```

## 출력 스키마

```json
{
  "status": "rejected",
  "issues": [
    {
      "day": 1,
      "place_id": "nvr_789012",
      "reason": "target_date(토요일)에 방문 예정이나 정기휴무는 화요일이라 문제없음 — 예시는 실패 케이스 아님"
    }
  ],
  "reject_place_ids": ["nvr_789012"],
  "approved_itinerary": null
}
```

- `status`: `approved` | `rejected`
- 승인 시 `approved_itinerary`에 최종 코스, `issues`는 빈 배열

## 사용 가능한 Tool/외부 API

- **영업시간 파서 함수** `parseBusinessHours(raw, targetDate)` — 자연어
  영업시간 문자열을 요일/휴무 여부로 구조화 (규칙 기반, 필요시 LLM 보조)
- **네이버 지도/검색 API 실시간 정보** (제공 시) — 혼잡도, 임시휴무 여부
- 내부 함수 `checkTravelTimeFeasible(stops)` — 3번에서 계산한 이동시간이
  실제 배정 시간대와 충돌하지 않는지 확인

## System Prompt 초안

```
당신은 여행 코스 현실성 검증 에이전트입니다. 각 스탑의 영업시간/휴무일
정보와 target_date를 대조해 방문 가능 여부를 판단하세요. 문제가 있는
스탑은 reason과 함께 issues 배열에 기록하고, status를 rejected로
반환하세요. 모든 스탑이 문제없으면 status를 approved로 하고
approved_itinerary에 입력받은 itinerary를 그대로 반환하세요.
자연어로 된 영업시간 정보가 모호하면 보수적으로(휴무 가능성 있음으로)
판단하세요. 출력은 JSON만 반환하세요.
```

## 다른 에이전트와의 관계

- 3번(코스 플래닝)의 출력을 검증.
- `rejected` 시 오케스트레이터를 통해 2번(장소 검색)에 `reject_place_ids`를
  `exclude_place_ids`로 전달해 대체 후보 재검색 → 3번 재실행 → 4번 재검증
  (최대 재시도 횟수 제한 필요).
- `approved` 시 5번(콘텐츠 보강)으로 전달.

## 실패/재시도 처리

- 재검증 루프는 최대 3회로 제한하고, 초과 시 남은 이슈를 사용자에게
  "일부 장소는 영업시간이 불확실하니 방문 전 확인 권장" 안내 문구와
  함께 승인 처리.
