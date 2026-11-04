// 홈 히어로에 넣을 QR 코드를 만든다. 실행: npm run build:qr
//
// 주소가 고정이라 요청마다 만들 이유가 없다 — 이 저장소의 다른 자료처럼 오프라인에서
// 한 번 만들어 커밋한다. 주소가 바뀌면(도메인을 옮기면) 다시 돌린다.
//
// **언어마다 따로 만든다.** /ja를 보던 사람이 찍으면 휴대폰에서도 일본어로 열려야 한다.
//
// 그림 파일(.svg)이 아니라 **경로 데이터**로 뽑는 이유:
//   · next/image로 SVG를 쓰려면 next.config의 dangerouslyAllowSVG를 켜야 한다.
//     QR 하나 때문에 그 설정을 열지 않는다.
//   · 인라인 <svg>로 그리면 히어로에 요청이 하나도 늘지 않는다(접힘선 위다).
//   · 색을 CSS 토큰으로 다룰 수 있다.
import { loadEnvConfig } from "@next/env";
import { writeFileSync } from "node:fs";
import path from "node:path";
import QRCode from "qrcode";

loadEnvConfig(process.cwd());

const BASE = "https://aiyptrip.web.app";
const OUTPUT = path.join(process.cwd(), "src/lib/data/qr.json");

// 찍는 거리가 가까워(책상 앞 모니터) 정정 수준은 M이면 넉넉하다. 여백(margin)은
// QR 바깥의 조용한 영역이라 2모듈 아래로 줄이면 인식률이 떨어진다.
const OPTIONS = { errorCorrectionLevel: "M", margin: 2, type: "svg" } as const;

/** qrcode가 뱉은 SVG에서 모듈 수와 선 경로만 꺼낸다. 형식이 바뀌면 여기서 멈춘다. */
function extract(svg: string): { size: number; path: string } {
  const size = Number(/viewBox="0 0 (\d+) \d+"/.exec(svg)?.[1]);
  const path = /<path stroke="[^"]*" d="([^"]+)"/.exec(svg)?.[1];
  if (!Number.isFinite(size) || !path) {
    throw new Error(`qrcode의 SVG 형식이 달라졌다 — 스크립트를 고쳐야 한다:\n${svg.slice(0, 200)}`);
  }
  return { size, path };
}

async function main() {
  const { LOCALES } = await import("@/lib/i18n/config");

  const codes: Record<string, { url: string; size: number; path: string }> = {};
  for (const locale of LOCALES) {
    const url = `${BASE}/${locale}`;
    const svg = await QRCode.toString(url, OPTIONS);
    codes[locale] = { url, ...extract(svg) };
    console.log(`  ${locale}  ${url}  (${codes[locale].size}×${codes[locale].size} 모듈)`);
  }

  writeFileSync(
    OUTPUT,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), codes }, null, 1)}\n`,
    "utf8",
  );
  console.log(`\n${path.relative(process.cwd(), OUTPUT)} 저장`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
