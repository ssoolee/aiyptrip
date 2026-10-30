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
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const nextDir = path.join(root, ".next");
const publicDir = path.join(root, "public");
const functionsDir = path.join(root, "functions");
const hostingDir = path.join(root, "hosting");

if (!existsSync(nextDir)) {
  throw new Error("빌드 결과(.next)가 없다 — npm run build를 먼저 돌린다.");
}

// 함수 몫에서 빼는 디렉터리. cache는 빌드 캐시, dev는 `next dev`가 남긴 것이라 둘 다
// SSR에 쓰이지 않는다 (dev 안에도 아래의 깨진 심볼릭 링크가 하나 더 들어 있다).
const skipDirs = [path.join(nextDir, "cache"), path.join(nextDir, "dev")];

function isInside(src: string, dir: string): boolean {
  return src === dir || src.startsWith(dir + path.sep);
}

function reset(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
}

// 1. 함수 몫
reset(path.join(functionsDir, ".next"));
cpSync(nextDir, path.join(functionsDir, ".next"), {
  recursive: true,
  filter: (src) => !skipDirs.some((dir) => isInside(src, dir)),
});

// Turbopack은 번들에 넣지 않는 패키지(firebase-admin)를 해시 붙은 별칭으로 바꿔 두고,
// .next/node_modules/<별칭> → <로컬 node_modules>/<패키지> **절대경로** 심볼릭 링크로 잇는다.
// 그 디렉터리를 함수 쪽으로 가져갈 길은 없다 — firebase CLI가 이름이 node_modules인
// 디렉터리를 깊이에 상관없이 업로드에서 빼기 때문이다(matchBase, lib/fsAsync.js).
// 그래서 별칭을 functions/package.json에 npm alias로 적어 두고, 서버가 npm install 할 때
// /workspace/node_modules/<별칭>으로 만들게 한다. Node는 .next/server/... 에서 위로
// 거슬러 올라가며 찾으므로 거기서 해결된다.
//
// 해시는 빌드가 정한다. 바뀌었는데 package.json이 그대로면 배포는 성공하고 SSR만
// 500이 나므로(Cannot find package 'firebase-admin-<해시>'), 여기서 미리 막는다.
const aliasDir = path.join(nextDir, "node_modules");
if (existsSync(aliasDir)) {
  const declared = JSON.parse(
    readFileSync(path.join(functionsDir, "package.json"), "utf8"),
  ) as { dependencies?: Record<string, string> };
  const missing = readdirSync(aliasDir).filter((alias) => !declared.dependencies?.[alias]);
  if (missing.length > 0) {
    throw new Error(
      `.next/node_modules의 별칭이 functions/package.json에 없다: ${missing.join(", ")}\n` +
        `functions/package.json의 dependencies에 "<별칭>": "npm:<실제 패키지>@<버전>"을 추가하고 ` +
        `functions에서 npm install을 돌린다.`,
    );
  }
}
reset(path.join(functionsDir, "public"));
cpSync(publicDir, path.join(functionsDir, "public"), { recursive: true });

// 2. Hosting 몫
reset(hostingDir);
cpSync(publicDir, hostingDir, { recursive: true });
cpSync(path.join(nextDir, "static"), path.join(hostingDir, "_next", "static"), { recursive: true });

console.log("배포 산출물을 나눴다 — functions/.next, functions/public, hosting/");
