# 6. 웹디자인 트렌드 에이전트 (Web Design Trend Agent)

> ⚠️ **다른 에이전트와의 성격 차이**: 1~5번 에이전트는 사용자의 여행
> 코스 추천 요청마다 실시간으로 호출되는 **서비스 런타임 에이전트**다.
> 이 에이전트는 그렇지 않다 — 여행자와 대화하지 않으며, **개발/운영
> 단계에서 주기적으로 실행되어 서비스의 디자인 기준을 최신 트렌드에
> 맞게 갱신하는 디자인 리서치 에이전트**다. 사용자 응답 경로에는
> 포함되지 않는다.

## 역할/책임

최신 웹/모바일 UI·UX 트렌드(레이아웃, 컬러 팔레트, 타이포그래피,
마이크로 인터랙션, 접근성 기준 변화 등)를 조사하고, 그 결과를
서비스에 바로 적용 가능한 **디자인 토큰/가이드**로 정리한다. 산출물은
[`docs/prd/05-responsive-mobile-ui-prd.md`](../prd/05-responsive-mobile-ui-prd.md)의
디자인 기준과 실제 프론트엔드 구현(예: Tailwind 설정, 컴포넌트 스타일)
의 근거 자료로 쓰인다.

## 입력 스키마

```json
{
  "current_design_tokens_version": "2026-06-01",
  "research_scope": ["color", "typography", "layout", "micro_interaction", "accessibility"],
  "reference_services": ["국내외 유사 여행/로컬 추천 서비스 벤치마크 대상 목록"]
}
```

## 출력 스키마

```json
{
  "design_tokens_version": "2026-09-01",
  "tokens": {
    "color": {
      "primary": "#2F6F4F",
      "accent": "#F2A65A",
      "background_light": "#FAFAF7",
      "background_dark": "#14181A"
    },
    "typography": {
      "font_family": "Pretendard, system-ui, sans-serif",
      "scale": ["12px", "14px", "16px", "20px", "28px", "36px"]
    },
    "spacing_unit_px": 4,
    "radius": { "card": "16px", "button": "999px" },
    "motion": { "duration_ms": 200, "easing": "cubic-bezier(0.4,0,0.2,1)" }
  },
  "trend_summary": "2026년 하반기 트렌드 요약 (예: 저채도 자연색 팔레트, 큰 라운드 카드, 절제된 모션 등)",
  "change_rationale": [
    "기존 primary 컬러가 채도가 높아 최근 자연/힐링 테마 트렌드와 맞지 않아 저채도 그린으로 조정"
  ],
  "applies_to": ["05-responsive-mobile-ui-prd.md", "코스 카드 컴포넌트", "찜 버튼 스타일"]
}
```

## 사용 가능한 Tool/외부 API

- 웹 검색/리서치 도구 (최신 디자인 트렌드 아티클, Awwwards/Dribbble류
  벤치마크, 경쟁 여행 서비스 UI 조사)
- (선택) 스크린샷 캡처·비교 도구 — 경쟁 서비스 UI 시각 비교
- 없음 — 네이버/TourAPI 등 장소 데이터 API와는 무관

## System Prompt 초안

```
당신은 웹/모바일 서비스의 UI 디자인 트렌드를 조사하고 디자인 토큰을
갱신하는 에이전트입니다. 이 서비스는 양평군 지역 여행 코스를 추천하는
반응형 웹서비스이며, 타겟 사용자는 커플/가족/친구/솔로 여행객입니다.
자연/힐링/로컬 감성에 어울리는 최신 트렌드를 우선 반영하세요.

research_scope에 명시된 영역만 조사하고, 결과는 반드시 실무에서 바로
쓸 수 있는 구체적 값(hex 컬러, px 단위, 폰트명)으로 제시하세요. 추상적
표현("세련된 느낌")만 남기지 마세요. 기존 토큰 대비 변경 사항이 있다면
change_rationale에 변경 이유를 근거와 함께 명시하세요. 출력은 JSON만
반환하세요.
```

## 다른 에이전트와의 관계

- 1~5번 런타임 파이프라인과 데이터를 주고받지 않는다 (완전히 분리된 트랙).
- 산출물(디자인 토큰)은 프론트엔드 구현 시 참조되며,
  [`docs/prd/05-responsive-mobile-ui-prd.md`](../prd/05-responsive-mobile-ui-prd.md)의
  기준을 갱신하는 근거 자료로 쓰인다.

## 실행 트리거 및 주기

- 사용자 요청 기반이 아닌 **스케줄 기반**(예: 분기 1회) 또는 운영자
  수동 트리거로 실행한다.
- 실행 후 산출물은 즉시 자동 반영되지 않고, 운영자/디자이너 검토를
  거쳐 PRD 및 실제 스타일 코드에 반영하는 **휴먼 인 더 루프(human-in-the-loop)**
  프로세스를 따른다 (사용자에게 보이는 서비스 디자인이 검증 없이
  자동으로 바뀌는 것을 방지).

## 실패/재시도 처리

- 리서치 결과가 기존 토큰과 큰 차이가 없을 경우 "변경 없음"으로 응답
  가능(불필요한 변경 방지).
- 조사 근거가 불충분한 항목은 해당 영역만 비워두고, 전체 실행을
  실패 처리하지 않는다.
