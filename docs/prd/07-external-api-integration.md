# PRD-07. 외부 API 연동 목록 (추천)

## 1. 배경/목표

`docs/agents/`와 `docs/prd/00~06`에서 언급된 데이터·기능 요구사항을
실제로 구현하기 위해 필요한 **외부 API를 한 곳에 정리**한다. 각 API가
어느 문서(에이전트/PRD)와 연결되는지 명시하고, 기존 문서의 오픈 이슈
중 구체적인 API로 해소 가능한 항목은 해소안을 함께 제시한다.

> **결정 사항 (변경)**: 장소 검색·지도 렌더링·길찾기의 **주 데이터
> 소스를 네이버(네이버 검색 API + Naver Cloud Platform)로 전환**하고,
> **카카오는 로그인(카카오 로그인) 용도로만** 사용한다. 지도/장소
> 데이터를 두 회사 API로 이원화하면 장소 ID 매칭·중복제거 부담만
> 커지므로, 지도·장소 계열은 네이버로 단일화한다.

## 2. 전체 API 목록

| 분류 | 추천 API | 용도 | 인증방식 | 우선순위 | 관련 문서 |
|---|---|---|---|---|---|
| 장소 검색/연락처/인기도 | **네이버 검색 API (지역 검색, `local.json`)** | 맛집·카페·관광지·숙소 검색, 상호명/주소/전화번호, 블로그·카페 언급 기반 인기도 신호 | 네이버 개발자센터 Client ID/Secret | Must | `docs/agents/02-place-retrieval-agent.md` |
| 지도 렌더링 | **네이버 지도 Dynamic Map SDK (Naver Cloud Platform)** | 마커/동선(폴리라인)/인포윈도우 표시 | NCP Client ID (도메인 등록) | Must | `02-map-realtime-location-prd.md` |
| 자동차 경로/소요시간 | **네이버 Directions 5 API (Naver Cloud Platform)** | 자차 이동시간·경로 계산 | NCP API Key | Must | `docs/agents/03-itinerary-composer-agent.md`, `02-map-realtime-location-prd.md` |
| 좌표 변환 | **네이버 Geocoding / Reverse Geocoding API (NCP)** | 주소 ↔ 좌표 변환, 검색 API가 반환하는 TM128(KATEC) 좌표를 WGS84로 보정 | NCP API Key | Must | `docs/agents/02-place-retrieval-agent.md` |
| 대중교통 경로 | **ODsay 대중교통 길찾기 API** (대안: 티맵 API) | 버스/지하철 기반 이동시간 계산 — 네이버는 대중교통 길찾기 API를 제공하지 않아 별도 필요 | API Key | Should | `docs/agents/03-itinerary-composer-agent.md`, `02-map-realtime-location-prd.md` |
| 관광지/숙소 상세 | **한국관광공사 TourAPI 4.0** (`detailCommon2`, `detailIntro2` 등) | 소개글, 사진, 부대시설, 이용요금 등 상세정보 | 공공데이터포털 인증키 | Must | `docs/agents/02-place-retrieval-agent.md`, `05-enrichment-presentation-agent.md` |
| **축제/행사 정보** | **TourAPI `searchFestival2`** | 양평군 축제 캘린더 데이터 소스 | 공공데이터포털 인증키 | Should | `01-ai-course-recommendation-prd.md` |
| **반려동물 동반정보** | **TourAPI 반려동물 동반여행 서비스(`detailPetTour2`)** | 반려동물 동반 가능 업체 필터링 | 공공데이터포털 인증키 | Should | `01-ai-course-recommendation-prd.md`, `03-place-detail-prd.md` |
| 날씨 | **기상청 단기예보 API (공공데이터포털)** | 여행일 날씨 기반 추천 보정(우천 시 실내 위주 등) | 공공데이터포털 인증키 | Should | `01-ai-course-recommendation-prd.md` |
| AI 추천 로직 | **Anthropic Claude API (Messages API)** | `docs/agents/` 1~5번 런타임 에이전트의 LLM 호출 | API Key | Must | `docs/agents/` 전체 |
| **로그인 전용** | **카카오 로그인 (Kakao Login)** | 사용자 인증(로그인)만 담당. 장소/지도/길찾기 용도로는 사용하지 않음 | 카카오 REST API Key + Firebase Custom Token 연동 | Must | `06-infra-deployment-prd.md`, `04-favorites-prd.md` |
| 인증 | **Firebase Authentication** | 로그인 세션 관리, 찜 데이터 사용자 구분 (이메일/구글/카카오 로그인 통합) | SDK/OAuth | Must | `06-infra-deployment-prd.md`, `04-favorites-prd.md` |
| DB | **Cloud Firestore** | 사용자별 찜, 사전 생성 코스 캐시, 축제/MBTI 매핑 저장 | SDK/보안규칙 | Must | `06-infra-deployment-prd.md` |
| 배포 | **Firebase Hosting / App Hosting** | 웹서비스 배포 | Firebase 프로젝트 | Must | `06-infra-deployment-prd.md` |
| 서버리스 실행 | **Cloud Functions for Firebase** | 에이전트 파이프라인 실행, 배치 스케줄, 외부 API 키 보호 | Firebase 프로젝트 | Must | `06-infra-deployment-prd.md` |
| (브라우저 표준 API) | **Geolocation API** | 실시간 사용자 위치 (외부 서비스 아닌 Web 표준 API) | 사용자 권한 동의 | Must | `02-map-realtime-location-prd.md` |

## 3. 오픈 이슈 해소 매핑

- [`01-ai-course-recommendation-prd.md`](./01-ai-course-recommendation-prd.md)
  §10 "축제 캘린더 데이터 소스(양평군청 공식 API 유무 확인 필요)" →
  **TourAPI `searchFestival2`**로 우선 해소 시도. 양평군 지역 코드로
  필터링해 축제 목록을 조회할 수 있으며, 별도 수동 캘린더 관리보다
  유지보수 부담이 적다.
- [`01-ai-course-recommendation-prd.md`](./01-ai-course-recommendation-prd.md)
  §10 및 [`03-place-detail-prd.md`](./03-place-detail-prd.md) §8
  "반려동물 동반/주차 가능 여부 등 커스텀 필드 확보 방안" →
  **TourAPI 반려동물 동반여행 서비스(`detailPetTour2`)**로 반려동물
  동반 가능 여부는 우선 해소. 단, 주차 가능 여부는 이 API로도 완전히
  커버되지 않을 수 있어 네이버 검색 API의 상세 필드와 교차 확인이
  필요(잔여 이슈로 유지).
- [`06-infra-deployment-prd.md`](./06-infra-deployment-prd.md) §7
  "소셜 로그인 제공자 범위" → **카카오 로그인으로 확정**(장소/지도
  용도는 아님). Firebase Authentication 비기본 제공자이므로 Firebase
  Custom Token 연동 구현이 필요(§7 상세 참조).

## 4. 우선순위 요약

- **1차(MVP) 필수**: 네이버 검색 API(지역 검색), 네이버 지도 SDK,
  네이버 Directions API, 네이버 Geocoding, TourAPI 기본 상세정보,
  Anthropic Claude API, 카카오 로그인, Firebase(Auth/Firestore/Hosting/Functions)
- **1차 권장(가능하면 포함)**: ODsay 대중교통, TourAPI 축제/반려동물
  서비스, 기상청 단기예보
- **2차 이후 검토**: 대중교통 API 대안 비교(ODsay vs 티맵), Cloud
  Storage(자체 사진 캐시 필요 시), **네이버 로그인**(소셜 로그인
  옵션 확장 검토)

## 5. 오픈 이슈

- ODsay API는 상업적 이용 시 별도 문의/계약이 필요할 수 있어, 실제
  요금제·이용약관 확인 후 티맵 API와 최종 비교 필요
- TourAPI의 반려동물/축제 서비스는 양평군 데이터 커버리지(등록된
  업체/행사 수)가 충분한지 사전 샘플 조회로 검증 필요
  → 반려동물: 표본 조회 결과 `detailPetTour2`의 양평군 등록 업체가 없어, 식품안전나라
  **"반려동물 동반 가능 업소 현황"**(음식점·카페·제과점, 2026-09-28 기준 양평군 24곳)을
  `data/pet-friendly.source.json` → `npm run build:pet` → `src/lib/data/petPlaces.json`으로
  반영했다. 관광지·숙소의 동반 가능 여부는 여전히 소개글 명시 여부에만 의존한다(잔여 이슈).
- 기상청 단기예보 API는 격자 좌표 변환(위경도 ↔ 기상청 격자) 로직이
  별도로 필요 — 구현 시 변환 유틸 확보 필요
- **네이버 지도/Directions API는 Naver Cloud Platform 소속으로,
  네이버 검색 API(네이버 개발자센터)와 발급·과금 체계가 다르다** —
  콘솔을 2곳(개발자센터, NCP)에서 각각 등록해야 하며, NCP 쪽은 유료
  종량제 요금 구조이므로 예산 계획에 반영 필요
- 카카오 로그인의 Firebase Custom Token 연동 구현 상세는
  `06-infra-deployment-prd.md` §7에서 별도 설계 필요
