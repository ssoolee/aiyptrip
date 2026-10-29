# 양평 AI 여행 코스 추천 (ypaicourse)

양평군 맛집·카페·관광명소·숙소를 하나의 "코스"로 묶어 추천하는 모바일 우선 웹서비스.
사용자가 자연어로 원하는 여행을 적거나 동행 유형(혼자/반려동물/MBTI)을
고르면, LLM 에이전트 파이프라인이 동선과 시간대를 고려한 1~2일 코스를 만들어
지도·사진·연락처까지 한 화면에 보여준다.

기획 배경과 요구사항은 [docs/prd/00-overview-prd.md](./docs/prd/00-overview-prd.md),
에이전트 설계는 [docs/agents/README.md](./docs/agents/README.md) 참조.

## 기술 스택

| 영역 | 사용 기술 |
|---|---|
| 프레임워크 | Next.js 16 (App Router, React 19, Server Actions) |
| 스타일 | Tailwind CSS 4 |
| LLM | Gemini(기본) / Anthropic Claude — `LLM_PROVIDER`로 전환 |
| 인증 | Firebase Authentication (Google, 이메일/비밀번호) — **현재 보류, 화면에서 내려둠** |
| DB | Cloud Firestore (찜 목록 동기화) |
| 지도·검색 | Naver Cloud Platform Maps / API HUB 지역·블로그 검색, 공공데이터포털 TourAPI |
| 배포 | Firebase App Hosting (백엔드 ID `aiyptrip`) — main 푸시 시 자동 배포 |

## 시작하기

```bash
npm install
cp .env.example .env.local   # 값 채우기 (아래 "환경 변수" 참조)
npm run dev
```

[http://localhost:3000](http://localhost:3000) 접속.

| 스크립트 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` / `npm start` | 프로덕션 빌드 / 실행 |
| `npm run lint` | ESLint |
| `npm test` | 단위 테스트 (영업시간 파서·검증·거리 계산) |
| `npm run build:places` | 장소 스냅샷 `src/lib/data/places.json` 재생성 |
| `npm run build:mbti` | MBTI 큐레이션 코스 `src/lib/data/mbtiCourses.json` 재생성 |
| `npm run build:pet` | 반려동물 동반 업소 `src/lib/data/petPlaces.json` 재생성 |
| `npm run build:hours` | 장소 스냅샷의 영업시간만 다시 수집 |

`build:*` 스크립트는 외부 API와 LLM을 호출하므로 `.env.local`이 채워져 있어야 한다.
요청마다 검색·태깅하지 않도록 **오프라인에서 한 번 만들어 커밋하는** 캐시이며,
자료가 바뀔 때만 다시 실행한다. 원천 자료는 `data/*.source.json`.

영업시간은 TourAPI에서 모은다 — 네이버 지역 검색으로 찾은 업체도 이름·좌표가 맞는
TourAPI 항목이 있으면 함께 채운다(89곳). 어느 API에도 없는
업체는 `build:hours`가 `data/hours.source.json`에 빈 항목으로 적어 두니, `hours`를
손으로 채우고(`"09:00~18:00 / 휴무: 매주 수요일"` 형식) 다시 실행하면 스냅샷에
반영된다 — 손으로 채운 값이 TourAPI 값보다 우선한다. 이 통로로 64곳을 더 채워
현재 숙소를 뺀 157곳 중 153곳에 영업시간이 있다. 영업시간을 모르는 장소는
코스 추천에서 뒤로 밀리고(`src/lib/agents/placeRetrieval.ts`), 상세 화면에는
"방문 전 확인" 안내가 붙는다.

## 환경 변수

`.env.example`이 전체 목록과 발급처를 담고 있다. 상세는
[docs/prd/07-external-api-integration.md](./docs/prd/07-external-api-integration.md) 참조.

- **LLM** — `LLM_PROVIDER`(gemini|anthropic), `GEMINI_API_KEY`, `GEMINI_MODEL`,
  `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`
- **지도/장소** — `NCP_MAP_CLIENT_ID`·`NCP_MAP_CLIENT_SECRET`(API HUB 지역·블로그 검색),
  `NCP_MAPS_API_KEY_ID`·`NCP_MAPS_API_KEY`(Geocoding·Directions),
  `NEXT_PUBLIC_NCP_MAP_CLIENT_ID`(브라우저 지도 SDK)
- **공공 데이터** — `TOUR_API_KEY`(필수), `ODSAY_API_KEY`·`WEATHER_API_KEY`(선택)
- **Firebase** — `NEXT_PUBLIC_FIREBASE_API_KEY`, `..._AUTH_DOMAIN`, `..._PROJECT_ID`, `..._APP_ID`,
  `FIREBASE_SERVICE_ACCOUNT_KEY`(선택 — 아래 "코스 저장" 참조)

`NEXT_PUBLIC_*`은 브라우저 번들에 들어가는 공개 값이고, 나머지는 서버 전용이다.
`.env.local`은 커밋하지 않는다.

## 화면 구성

| 경로 | 화면 |
|---|---|
| `/` | 평안이 히어로 + 자연어 검색창 + 동행 유형 프리셋 + 서비스 소개 3단계 |
| `/course/search` | 자연어 요청 기반 코스 추천 결과 (당일치기/1박 탭) |
| `/course/[preset]` | 유형별 코스 추천 결과 — `solo`·`pet`·`mbti`만, 나머지는 404 |
| `/course/mbti`, `/course/mbti/[type]` | MBTI 유형 선택 및 큐레이션 코스 |
| `/map` | 지도 + 실시간 위치 |
| `/pet-places` | 반려동물 동반 가능 업소 |
| `/favorites` | 찜한 코스 / 장소 (탭) |
| `/login`, `/profile` | 로그인 / 내 정보 — **보류 중이라 404** (아래 "로그인 보류" 참조) |
| (없는 주소) | 평안이 404 — `src/app/not-found.tsx` |

## 코스 유형 3종

홈의 유형 카드는 **혼자 여행 · 반려동물과 함께 · MBTI 성향별** 셋이다. 연인·가족·친구·
축제는 화면에서 내렸다 — `src/lib/presets.ts`의 `PRESETS`에서 뺐고, 목록에 없는
유형은 `/course/[preset]`이 `notFound()`로 404를 돌려준다.

되살리려면 `PRESETS`에 항목을 다시 넣고 `PresetType`(`src/types/travel.ts`)에 그
이름을 더하면 된다. 추천 엔진은 유형 이름을 따로 알지 못하고 `tags`만 보므로
(`src/lib/agents/orchestrator.ts`) 그밖에 손댈 곳은 없다. 축제 연계만은 예외로,
`tags`에 `"festival"`이 들어와야 TourAPI 축제 조회가 돌아가는데 그 태그를 넣던 것이
축제 프리셋뿐이라 지금은 그 길이 잠들어 있다(코드는 그대로 둔 채 — `placeRetrieval.ts`).

이미 찜해 둔 연인·가족·친구·축제 코스는 그대로 보인다. 찜은 코스 전체를 스냅샷으로
저장하고(`src/lib/favorites.ts`) 화면에 유형 이름을 쓰지 않는다.

자연어 검색창은 그대로다 — "연인과 조용한 뷰 카페"처럼 적으면 전과 같이 코스를 만든다.
유형 카드를 줄인 것이지 추천 범위를 줄인 것이 아니다.

## 코드 구조

```
src/app/            App Router 페이지
src/components/     화면 단위 컴포넌트 (지도, 코스 카드, 하단 내비게이션 등)
src/lib/actions.ts  추천 요청 Server Action (프론트 → 에이전트 진입점)
src/lib/agents/     에이전트 파이프라인 (요청 해석 → 장소 검색 → 코스 구성 → 검증 → 보강)
src/lib/api/        외부 API 클라이언트 (네이버 지역 검색, NCP Maps, TourAPI)
src/lib/llm/        LLM 공급자 추상화 (gemini / anthropic)
src/lib/data/       커밋된 장소·코스 스냅샷
src/lib/firebase/   Firebase 클라이언트, 인증(auth/), 찜(favorites.ts)
scripts/            스냅샷 생성 스크립트
public/character/   마스코트 '평안이' 그림 (PNG)
docs/               PRD, 에이전트 설계, 리서치 자료
```

서비스 전체의 얼굴은 양평 마스코트 **평안이**(직접 제작)다. 그림 파일은
`public/character/`에 두고 `next/image`로 쓴다 — 외부 호스트 사진에 쓰는
`<img>` 관례와 달리 로컬 파일은 설정 없이 srcset·WebP 변환을 받는다.
캐릭터 색은 `src/app/globals.css`의 `--color-character-*` 토큰에 적어 두었고,
히어로 배경 틴트(`--color-hero-*`)는 배경색에 섞어 만들어 다크모드에서도
그대로 동작한다.

그림을 화면에 올리는 통로는 `src/components/Mascot.tsx` 하나다. 표정 7종에 뜻을
정해 두고(`calm` 확인 중, `happy` 완성, `wow` 어라?, `heart` 찜, `wink` 골라보세요,
`smile` 중립, `hero` 홈) 쓸 수 있는 크기를 타입으로 묶었다 — 그림마다 또렷하게
보이는 상한이 달라(얼굴 원본 ~150px이라 72px까지, 하트 포즈는 56px까지) 넘기면
타입 검사에서 걸린다. 더 크게 보여야 하는 자리는 그림을 늘리지 않고
`MascotSpot`으로 둥근 배경을 키운다. `alt`는 컴포넌트가 `""`로 고정한다 —
그림은 모두 장식이고 뜻은 옆 글자가 나른다.

평안이가 모든 화면에 닿는 통로는 `PageHeader`(뒤로가기 + 제목 + 설명)와
`EmptyState`(보여줄 것이 없을 때)다. 하단 내비와 사진 없는 장소의 카테고리
이모지(🍚 ☕ 🏞 🏡)는 일부러 그대로 뒀다 — 작은 크기에서 네 칸/네 카테고리를
구분하는 정보를 캐릭터가 대신 나르지 못한다.

코스를 만드는 동안에는 `loading.tsx`가 평안이와 뼈대 카드를 보여준다
(`/course/search`, `/course/[preset]`, `/course/mbti/[type]`, `/course/detail/[courseId]`).
세그먼트 파일을 쓰는 이유는 이 화면이 미리 받아져 링크를 누르는 즉시 뜨기 때문이고,
대신 인자를 받을 수 없어(Next 16) 문구에 검색어나 MBTI 유형을 넣지 못한다.
움직임은 `globals.css`의 `prefers-reduced-motion` 블록에서 모두 꺼진다.

탭 아이콘과 공유 이미지는 `icon.tsx` / `apple-icon.tsx` / `opengraph-image.tsx`가
빌드 때 평안이 그림에서 만들어 낸다. `favicon.ico`는 코드로 만들 수 없어 지웠다.
공유 이미지에 글자를 넣지 않은 건 한글 폰트가 `ImageResponse`의 500KB 상한을 넘기
때문이고, 제목·설명은 SNS가 `og:title`/`og:description`으로 그림 옆에 보여준다.

추천 흐름: 사용자 입력 → `requestInterpreter`(조건 구조화) → `placeRetrieval`(후보 검색)
→ `itineraryComposer`(동선·시간대 배치) → `validation`(영업시간·휴무 검증) →
`enrichment`(사진·연락처·지도 링크 보강). `orchestrator`가 순서를 관장하고,
LLM 호출이 실패하면 규칙 기반 결과로 폴백한다.

## 찜(즐겨찾기) 동작

찜은 코스 찜과 장소 찜 두 종류다(찜 목록 화면의 탭). **로그인을 보류한 지금은
`localStorage`에만 저장한다.**

로그인을 다시 켜면, 로컬 데이터를 `users/{uid}/favoriteCourses`와
`users/{uid}/favoritePlaces`로 한 번 병합한 뒤 Firestore를 기준으로 동기화한다
(`src/lib/favorites.ts` — 두 종류가 같은 스토어 구현을 공유한다).
보안 규칙은 `firestore.rules` — 사용자 문서는 본인만, 공용 참조 데이터는 읽기 전용.

## 로그인 보류

Firebase 인증과 카카오 로그인 연동을 보류하면서, 로그인 기능 전체를 화면에서
내렸다. **코드는 지우지 않았다** — `src/lib/featureFlags.ts`의 `LOGIN_ENABLED`를
`true`로 바꾸면 그대로 돌아온다.

`false`일 때 달라지는 것:

- 하단 내비에서 '내정보'가 빠져 3칸이 된다 (`BottomNav.tsx`)
- `/login`·`/profile`은 `notFound()`로 404가 된다
- 찜 목록의 로그인 유도 배너가 사라진다 — `configured`가 `false`가 되면서
  `showLoginBanner` 조건이 저절로 꺼지는 것이라, 따로 가리지 않았다
- `AuthProvider`가 Firebase 인증을 아예 붙이지 않는다. 찜의 Firestore 동기화는
  이 Provider가 `attachFavoritesUser(uid)`를 부를 때만 켜지므로
  (`src/lib/auth/AuthProvider.tsx`), `favorites.ts`는 손대지 않아도 함께 꺼진다

이미 로그인해 둔 사용자의 세션은 무시되고 찜은 브라우저 저장분으로 돌아간다.
Firestore에 있던 데이터는 지우지 않으므로 다시 켜면 그대로 돌아온다.

`docs/prd/`는 카카오 로그인을 Must로 유지한다 — 요구사항이 바뀐 게 아니라
일정이 미뤄진 것이다.

## 네이버 블로그 리뷰

장소 상세 시트를 열면 그 장소의 **네이버 블로그 리뷰** 3건과 전체 건수를 보여준다
(`src/components/PlaceReviews.tsx` → `loadPlaceReviews` 서버 액션 →
`src/lib/api/naverBlogSearch.ts`).

**평점(별점)과 플레이스 방문자 리뷰는 넣을 수 없다.** 네이버가 공개 API로 주지 않는다 —
지역 검색 응답 필드는 title, link, category, description, telephone, address,
roadAddress, mapx, mapy뿐이고(공식 문서와 2026-10 실측 일치) 평점·리뷰 수 필드가 없다.
`sort=comment`로 "블로그·카페 리뷰 많은 순" 정렬만 할 수 있고 그 개수는 응답에 오지
않는다. 그래서 공식 API로 받을 수 있는 블로그 리뷰로 대신한다 — PRD-03 오픈 이슈에
적혀 있던 방향이다. `Place.rating` 필드와 상세 시트의 ⭐ 자리는 그대로 두었다(채우는
곳이 없어 지금은 비어 있다).

쓰려면 **NCP 콘솔에서 API HUB '블로그 검색'을 애플리케이션에 추가**해야 한다. 지역 검색만
구독된 키로는 `401 "요청한 API는 이 Application에서 활성화되어 있지 않습니다."`가 오고,
그때는 리뷰 영역이 조용히 빠진다(키 없음·결과 없음도 같다). 하루 한도는 25,000회이고,
같은 장소를 여러 번 열어도 호출을 아끼려고 지역 검색·TourAPI와 같은 6시간 캐시를 쓴다.

검색어는 `"양평 {장소명} 후기"`다. "양평"은 전국의 같은 이름을 걸러내고, "후기"는
방문기가 아닌 글을 밀어낸다 — `"양평 두물머리"`의 상위 3건에는 살인사건 기사가 있었는데
`"양평 두물머리 후기"`로는 10건 모두 방문기였다(2026-10 실측).

받은 10건을 두 번 거른 뒤 3건을 보여준다: **글이 장소 이름을 한 번이라도 적었는지**
(띄어쓰기는 무시한다 — 블로그는 "하우스베이커리"처럼 붙여 쓴다), 그리고 사건·사고
낱말이 들어 있지 않은지. 두 번째는 "후기"를 붙인 뒤로 걸린 적이 없지만, 한 번 새면
관광지 소개 옆에 사건 기사가 붙으므로 그물을 하나 더 둔 것이다. 남는 글이 없으면
영역을 접는다.

그래도 블로그 글이라 장소와 느슨하게만 엮인 글이 남을 수 있다 — 블로그에 거의 안
올라오는 곳이 그렇다(실측: 지평레포츠공원은 전체 48건뿐이라 개인 일기가 남는다).
제목에 "블로그 리뷰"라고 적어 출처를 밝히는 이유다.

## 코스 저장

추천 코스는 요청마다 새로 만들어지므로, 생성 직후 Firestore `precomputedCourses`에
남겨 `/course/detail/[courseId]`를 나중에 다시 열 수 있게 한다
(`src/lib/courseStore.ts`, 응답을 늦추지 않도록 `after()`로 미뤄 쓴다).

쓰기는 Admin SDK만 한다 — App Hosting에서는 서비스 계정이 자동으로 붙어 설정이 없고,
로컬에서 저장까지 보려면 `FIREBASE_SERVICE_ACCOUNT_KEY`에 서비스 계정 키의 경로나 JSON을
넣는다. 자격증명이 없으면 저장만 건너뛰고, 상세 화면은 찜 목록과 세션 저장소
(`src/lib/courseCache.ts`)에 남은 코스로 열린다.

문서에는 30일 뒤 시각을 `expiresAt`으로 넣어 둔다. Firestore 콘솔에서 이 필드에
TTL 정책을 걸면 지난 코스가 자동으로 지워진다 (걸지 않으면 계속 쌓인다).

## 배포

Firebase App Hosting에 배포한다. 런타임 설정과 환경 변수 매핑은 `apphosting.yaml`,
백엔드 지정은 `firebase.json`에 있다. 비공개 키는 파일에 적지 않고 Cloud Secret Manager를 참조한다.

### 접속 주소

| 주소 | 역할 |
|---|---|
| https://aiyptrip.web.app | 외우기 쉬운 입구 — 아래 주소로 넘긴다(302) |
| https://aiyptrip--aiyptrip.asia-east1.hosted.app | 앱이 실제로 도는 곳 |

`web.app`은 **Firebase Hosting**이 주는 주소이고 이 앱이 올라간 **App Hosting**은
`*.hosted.app`만 준다 — 서로 다른 제품이다. 그래서 Hosting 사이트 `aiyptrip`을 앞에 두고
모든 경로를 넘긴다(`firebase.json`의 `hosting.redirects`).

주소창까지 `aiyptrip.web.app`으로 유지하려면 리다이렉트가 아니라 **리라이트**가 필요한데,
Hosting→Cloud Run 리라이트는 **403으로 막힌다**(2026-10 실측). App Hosting은 자체
로드밸런서·CDN만 통과시키도록 Cloud Run 서비스의 ingress를 잠가 두기 때문이다. Hosting
리라이트 타깃에는 App Hosting 백엔드를 직접 가리키는 항목이 없고(`run`/`function`/
`destination`/`dynamicLinks`뿐), `web.app`은 구글 소유 도메인이라 App Hosting 커스텀
도메인으로도 붙일 수 없다(DNS 레코드를 등록할 수 없다). 주소창까지 바꾸려면 도메인을 사서
App Hosting에 직접 붙이는 길뿐이다.

**301이 아니라 302를 쓴다** — 301은 브라우저가 오래 캐시해서 나중에 방식을 바꿀 때
되돌리기 어렵다.

**네이버 지도 콘솔(NCP)의 Web 서비스 URL에 `hosted.app` 주소를 등록해야 지도가 뜬다.**
등록하지 않은 도메인에서는 지도 SDK 인증이 실패해 지도 영역만 빈 화면이 된다.

### 배포 방법

GitHub 저장소가 백엔드에 연결돼 있어 **main에 푸시하면 자동으로 빌드·롤아웃된다.**
코드 변경 없이 다시 구울 때만 직접 롤아웃을 만든다.

```bash
npx firebase-tools apphosting:rollouts:create aiyptrip --git-branch main
npx firebase-tools apphosting:rollouts:list aiyptrip        # 진행 상황
npx firebase-tools apphosting:backends:get aiyptrip         # 백엔드·URL 확인
```

키 등록과 Firestore 규칙 배포는 따로 한다.

```bash
npx firebase-tools apphosting:secrets:set <시크릿-이름>   # 키 등록
npx firebase-tools deploy --only firestore                # 규칙·인덱스 배포
```

상세는 [docs/prd/06-infra-deployment-prd.md](./docs/prd/06-infra-deployment-prd.md) 참조.

## 문서

- `docs/prd/` — 서비스 개요부터 기능별 요구사항(추천·지도·상세·찜·반응형·인프라·외부 API)
- `docs/agents/` — 에이전트 6종의 역할·프롬프트·툴 설계
- `docs/research/` — MBTI 코스, 반려동물 동반 장소 리서치 원본

## 데이터 출처

`src/lib/data/places.json`은 **네이버 오픈API 지역 검색(76곳)과 공공데이터포털
TourAPI(101곳)** 의 응답을 골라 담고 LLM 요약을 붙인 캐시다. 장소 사진은
`tong.visitkorea.or.kr`(TourAPI) 주소를 그대로 불러 쓴다. 반려동물 동반 업소
(`data/pet-friendly.source.json`)는 식품안전나라 "반려동물 동반 가능 업소 현황"에서
양평군만 추린 것이다.

이 데이터를 다시 쓸 때는 각 제공자의 이용약관을 따라야 한다 — 특히 네이버 오픈API는
검색 결과의 저장·재배포에 제한이 있다. 원본 엑셀·PDF는 저장소에 담지 않았다
(`docs/research/` 참조).
