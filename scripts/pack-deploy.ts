// 빌드 산출물을 Hosting 몫과 함수 몫으로 나눈다. 실행: npm run pack:deploy (npm run build 다음)
//
// 이 앱은 Firebase Hosting(aiyptrip.web.app)이 정적 파일을 직접 주고, 나머지 모든 경로를
// 2세대 함수 `nextServer`로 리라이트하는 구조다(firebase.json). 그래서 한 번의 빌드 결과를
// 두 곳으로 나눠 둬야 한다.
//
//   functions/.next, functions/public — 함수가 SSR할 때 읽는다. public/은 /_next/image
//     최적화가 원본 파일을 읽어야 해서 함께 들어간다. .next/cache는 빌드 캐시라 뺀다
//     (전체 100MB 중 대부분이 캐시다 — 업로드 시간이 그만큼 줄어든다).
//   hosting/ — Hosting이 CDN에서 바로 주는 파일. 해시가 붙은 /_next/static과 public/만 올린다.
//     미리 렌더된 HTML은 **올리지 않는다** — Hosting은 정적 파일을 리라이트보다 먼저 집어서,
//     HTML이 올라가 있으면 RSC 내비게이션 응답 대신 그 파일이 나가 화면 전환이 깨진다.
//
// 산출물은 커밋하지 않는다(.gitignore). 다시 돌려도 안전하게 대상 디렉터리를 먼저 비운다.
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const nextDir = path.join(root, ".next");
const publicDir = path.join(root, "public");
const functionsDir = path.join(root, "functions");
const hostingDir = path.join(root, "hosting");

if (!existsSync(nextDir)) {
  throw new Error("빌드 결과(.next)가 없다 — npm run build를 먼저 돌린다.");
}

const cacheDir = path.join(nextDir, "cache");

function reset(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
}

// 1. 함수 몫
reset(path.join(functionsDir, ".next"));
cpSync(nextDir, path.join(functionsDir, ".next"), {
  recursive: true,
  filter: (src) => src !== cacheDir && !src.startsWith(cacheDir + path.sep),
});
reset(path.join(functionsDir, "public"));
cpSync(publicDir, path.join(functionsDir, "public"), { recursive: true });

// 2. Hosting 몫
reset(hostingDir);
cpSync(publicDir, hostingDir, { recursive: true });
cpSync(path.join(nextDir, "static"), path.join(hostingDir, "_next", "static"), { recursive: true });

console.log("배포 산출물을 나눴다 — functions/.next, functions/public, hosting/");
