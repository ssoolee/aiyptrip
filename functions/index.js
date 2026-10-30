// Next.js를 Firebase Hosting이 부를 수 있는 2세대 함수로 감싼다.
//
// 이 앱은 App Hosting(`*.hosted.app`)이 아니라 Hosting 사이트 `aiyptrip`에서 서비스한다
// (주소: https://aiyptrip.web.app). Hosting 리라이트가 가리킬 수 있는 대상은 함수와
// Cloud Run뿐이어서, SSR을 함수 하나로 감싸고 firebase.json이 모든 경로를 여기로 넘긴다.
//
// 빌드 산출물(.next)과 public/은 `npm run pack:deploy`가 이 디렉터리로 복사한다 —
// 커밋 대상이 아니므로, 배포 전에 루트에서 `npm run build && npm run pack:deploy`를 먼저 돌린다.
// Next를 프로그램으로 띄우는 방법은 next의 커스텀 서버 문서를 따른다
// (node_modules/next/dist/docs/01-app/02-guides/custom-server.md).
// `output: "standalone"`은 커스텀 서버와 함께 쓸 수 없다고 같은 문서에 적혀 있어 쓰지 않는다.
const { IncomingMessage } = require("node:http");
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

// apphosting.yaml이 참조하던 키들. Secret Manager의 시크릿 이름이 곧 환경변수 이름이 되므로
// App Hosting 때의 케밥케이스(gemini-api-key)가 아니라 대문자 스네이크로 등록한다
// (등록: npx firebase-tools functions:secrets:set GEMINI_API_KEY).
const SECRETS = [
  "GEMINI_API_KEY",
  "TOUR_API_KEY",
  "NCP_SEARCH_KEY_ID",
  "NCP_SEARCH_KEY",
  "NCP_MAPS_KEY_ID",
  "NCP_MAPS_KEY",
].map((name) => defineSecret(name));

// 배포할 때 firebase CLI가 이 파일을 읽어 함수 목록만 뽑아 간다. 그때 Next까지 깨우면
// 배포가 느려지고 시크릿도 아직 없으므로, 첫 요청에서 한 번만 준비한다.
let handlerPromise;

function getHandler() {
  handlerPromise ??= (async () => {
    const next = require("next");
    const app = next({ dev: false, dir: __dirname });
    await app.prepare();
    return app.getRequestHandler();
  })();
  return handlerPromise;
}

/**
 * 함수 프레임워크는 요청 본문을 미리 읽어 `req.rawBody`에 담아 두고 스트림을 닫는다.
 * Next의 요청 핸들러는 본문을 스트림에서 직접 읽으므로(서버 액션의 POST가 그렇다)
 * 닫힌 스트림을 그대로 넘기면 본문이 빈 것으로 보여 액션이 응답하지 못한다.
 * 그래서 아직 읽지 않은 요청을 하나 만들어 본문을 다시 실어 보낸다.
 */
function withReplayableBody(req) {
  if (!req.rawBody?.length) return req;

  const replay = new IncomingMessage(req.socket);
  replay.httpVersion = req.httpVersion;
  replay.httpVersionMajor = req.httpVersionMajor;
  replay.httpVersionMinor = req.httpVersionMinor;
  replay.method = req.method;
  replay.url = req.url;
  replay.headers = req.headers;
  replay.rawHeaders = req.rawHeaders;
  replay.push(req.rawBody);
  replay.push(null);
  replay.complete = true;
  return replay;
}

// 런타임 설정은 App Hosting에서 쓰던 값(apphosting.yaml)을 그대로 옮긴 것이다.
// timeoutSeconds는 Hosting의 60초 요청 제한에 맞춘다 — 더 길게 둬도 Hosting이 504를 돌려준다.
exports.nextServer = onRequest(
  {
    region: "asia-northeast3",
    memory: "512MiB",
    cpu: 1,
    concurrency: 80,
    minInstances: 0,
    maxInstances: 2,
    timeoutSeconds: 60,
    invoker: "public",
    secrets: SECRETS,
  },
  async (req, res) => {
    const handle = await getHandler();
    return handle(withReplayableBody(req), res);
  },
);
