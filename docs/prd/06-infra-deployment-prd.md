# PRD-06. 인프라 · 배포 (Firebase)

## 1. 배경/목표

서비스 배포와 사용자별 데이터 저장(특히 즐겨찾기/찜 기능,
[`04-favorites-prd.md`](./04-favorites-prd.md))을 **Firebase**로
구축한다. 별도 서버 인프라를 직접 운영하지 않고 Firebase의 관리형
서비스(Hosting/App Hosting, Authentication, Firestore, Cloud
Functions)를 조합해 빠르게 배포하고, 사용자별 조회가 필요한 데이터를
안전하게 저장·동기화한다.

## 2. 사용 Firebase 서비스 구성

| 영역 | Firebase 서비스 | 용도 |
|---|---|---|
| 배포/호스팅 | **Firebase Hosting** 또는 **Firebase App Hosting** | 반응형 웹(정적/SSR) 배포. 프론트엔드가 SPA(정적 빌드)면 Hosting, Next.js 등 SSR 프레임워크면 App Hosting 사용 (§7 오픈 이슈에서 확정) |
| 사용자 인증 | **Firebase Authentication** (이메일/구글 로그인 + **카카오 로그인**) | 로그인 여부 판별 → 찜 데이터를 "사용자별"로 구분·동기화하는 데 필수. **카카오는 이 서비스에서 로그인 용도로만 사용**하며, 장소 검색/지도 API로는 사용하지 않는다 |
| 데이터베이스 | **Cloud Firestore** | 사용자별 즐겨찾기(코스 찜/장소 찜), 사전 생성 코스 캐시(`precomputed_courses`), MBTI 매핑·축제 캘린더 등 저장 |
| 서버 로직 | **Cloud Functions for Firebase** | `docs/agents/`의 에이전트 파이프라인 실행(오케스트레이터~콘텐츠보강), 사전 생성 코스 배치 작업(스케줄 트리거), 외부 API(네이버/TourAPI) 호출을 서버 사이드에서 안전하게 처리(API 키 보호) |
| (선택) 파일 저장 | **Cloud Storage for Firebase** | 자체 수집 장소 사진을 캐시하는 경우에만 사용 (기본은 네이버/TourAPI 사진 URL 직접 참조로 충분) |

## 3. 사용자별 즐겨찾기 데이터 모델 (Firestore)

로그인 사용자를 기준으로 아래와 같이 사용자별 하위 컬렉션 구조로
저장한다 (Firestore는 컬렉션/문서가 번갈아 나오는 구조를 따른다).

```
users/{uid}                              // 사용자 프로필 문서
users/{uid}/favoriteCourses/{courseId}   // 코스 찜 (1문서 = 코스 1개)
users/{uid}/favoritePlaces/{placeId}     // 장소 찜 (1문서 = 장소 1개)
```

예시 문서 (`users/{uid}/favoriteCourses/{courseId}`):

```json
{
  "title": "감성 카페와 물멍 스팟으로 채운 두물머리 힐링 코스",
  "presetType": "couple",
  "savedAt": "2026-09-12T10:00:00+09:00",
  "itinerarySnapshot": { "...": "찜 시점의 코스 스냅샷" }
}
```

- [`04-favorites-prd.md`](./04-favorites-prd.md)에서 정의한 로컬(비로그인)
  저장 구조와 필드명을 동일하게 맞춰, 로그인 시 localStorage → Firestore
  병합 로직을 단순화한다 (필드 매핑 변환 최소화).
- **비로그인 사용자**는 Firestore에 쓰지 않고 브라우저 localStorage만
  사용, 로그인 성공 시 Cloud Functions(또는 클라이언트 SDK) 호출로
  1회성 병합(merge) 수행 후 이후 Firestore 기준으로 전환한다
  (`04-favorites-prd.md` §4 Must 항목과 동일 요구사항, 여기서는 구현
  주체를 Firebase로 명시).

## 4. 보안 규칙 (Firestore Security Rules) 요구사항

- 각 사용자는 `users/{uid}/**` 경로에서 **자기 자신의 문서만** 읽기/쓰기
  가능해야 한다 (`request.auth.uid == uid` 검증 필수).
- `precomputed_courses`, `festival_calendar`, `mbti_tag_mapping` 등
  공용 참조 데이터는 모든 사용자에게 **읽기 전용**으로 공개하고, 쓰기는
  Cloud Functions(관리자 권한/서비스 계정)에서만 허용한다.
- 배포 전 보안 규칙에 대해 별도 감사(룰 화이트박스 점검)를 거친다.

## 5. 사전 생성 코스 배치 실행 방식

- [`01-ai-course-recommendation-prd.md`](./01-ai-course-recommendation-prd.md)
  §4.1에서 정의한 "프리셋별 최소 3개 사전 생성"은 **Cloud Functions의
  예약 실행(Scheduled Functions, Cloud Scheduler 연동)**으로 구현한다
  (1일 1회 기본 주기).
- 실시간 추가 생성(§4.2)은 **HTTPS Callable Function** 또는 HTTP
  엔드포인트로 구현해 프론트엔드에서 직접 호출한다.

## 6. 비기능 요구사항

- 네이버/TourAPI 키 등 민감정보는 클라이언트에 노출하지 않고
  Cloud Functions 환경변수(Secret Manager 연동)로 관리
- Firebase Hosting/App Hosting 배포는 GitHub 연동 CI/CD로 구성해
  main 브랜치 반영 시 자동 배포
- 비용 관리: Firestore 읽기/쓰기 횟수, Cloud Functions 실행 횟수에
  대한 예산 알림(Budget Alert) 설정

## 7. 오픈 이슈

- 프론트엔드 프레임워크 확정 필요 (SPA vs Next.js 등 SSR) → Hosting과
  App Hosting 중 배포 방식 결정에 직접 영향
- Firebase 요금제(Blaze 필요 — Cloud Functions 외부 API 호출 시 필수)
  전환 및 예산 승인 필요
- **소셜 로그인 제공자는 이메일/구글 + 카카오 로그인으로 확정** (카카오는
  장소/지도 API로는 쓰지 않고 로그인 전용). 다만 카카오 로그인은
  Firebase Authentication 기본 제공자가 아니므로, 카카오 SDK 인증 후
  발급받은 토큰을 검증해 **Firebase Custom Token**을 발급하는 백엔드
  로직(Cloud Functions)을 별도로 구현해야 함 — 구현 방식 상세 설계 필요
- 네이버 로그인 추가 여부는 `07-external-api-integration.md`의 "2차
  이후 검토" 항목으로 남겨둠
