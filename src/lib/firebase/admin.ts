import { applicationDefault, cert, getApps, initializeApp, type Credential } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";

// 서버에서만 쓰는 Firebase Admin (브라우저 SDK는 src/lib/firebase/client.ts).
// App Hosting(Cloud Run)에서는 서비스 계정이 자동으로 붙어 설정이 필요 없고, 로컬에서는
// FIREBASE_SERVICE_ACCOUNT_KEY에 서비스 계정 키의 경로나 JSON 내용을 넣어야 한다.
// 자격증명이 없으면 null을 돌려주고 호출부가 조용히 건너뛴다 — 코스 서버 저장은 부가
// 기능이라(세션 저장소·찜 목록이 그대로 동작한다) 설정이 없다고 화면이 깨지면 안 된다.

// null = 쓸 수 없음(한 번 확인하면 다시 시도하지 않는다), undefined = 아직 확인 안 함.
let cached: Firestore | null | undefined;

export function getAdminDb(): Firestore | null {
  if (cached === undefined) cached = createDb();
  return cached;
}

/**
 * 자격증명을 기대할 수 있는 환경인지 본다. 아무것도 없는데 Admin SDK를 쓰면 구글
 * 메타데이터 서버를 찾아 나서다가 처리되지 않은 예외까지 남긴다 — 로컬에서는 아예 쓰지 않는다.
 * K_SERVICE는 Cloud Run(App Hosting 런타임)이 넣어 주는 값이다.
 */
function hasCredentials(): boolean {
  return Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim() ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      process.env.K_SERVICE ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.GCLOUD_PROJECT ||
      // 에뮬레이터(npx firebase-tools emulators:start --only firestore)는 자격증명이 필요 없다.
      process.env.FIRESTORE_EMULATOR_HOST,
  );
}

function createDb(): Firestore | null {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId || !hasCredentials()) return null;

  try {
    const app = getApps()[0] ?? initializeApp({ credential: resolveCredential(), projectId });
    const db = getFirestore(app);
    try {
      // 선택 필드가 undefined인 채로 들어오면 저장이 거부된다 — 없는 값으로 취급한다.
      db.settings({ ignoreUndefinedProperties: true });
    } catch {
      // 이미 쓰기 시작한 인스턴스에는 설정을 바꿀 수 없다 (개발 중 모듈 재적재).
    }
    return db;
  } catch (error) {
    console.warn("[firebase-admin] 초기화 실패 — 코스 서버 저장을 건너뜁니다.", error);
    return null;
  }
}

function resolveCredential(): Credential {
  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim();
  if (!key) return applicationDefault();
  // 값 자체가 JSON일 수도, 키 파일 경로일 수도 있다.
  const json = key.startsWith("{") ? key : readFileSync(key, "utf8");
  return cert(JSON.parse(json));
}
