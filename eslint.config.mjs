import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // 배포 산출물 (npm run pack:deploy가 만든다 — 빌드 결과를 복사한 것이다)
    "hosting/**",
    "functions/.next/**",
    "functions/public/**",
  ]),
  {
    // 함수 코드베이스는 CommonJS로 둔다 — Cloud Functions 런타임의 기본 모양이고,
    // 배포 때 firebase CLI가 이 파일을 읽어 함수 목록을 뽑아 간다.
    files: ["functions/**/*.js"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
]);

export default eslintConfig;
