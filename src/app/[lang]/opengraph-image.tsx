import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

// 링크를 공유했을 때 보이는 그림. 글자를 넣지 않는다 — Satori에는 한글 글리프가 없어
// 폰트를 함께 담아야 하는데, 본문용 한글 폰트는 ImageResponse의 500KB 상한을 넘는다.
// 제목·설명은 SNS가 og:title / og:description을 그림 옆 글자로 보여주므로 사라지지 않는다.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const hero = await readFile(join(process.cwd(), "public/character/hero.png"));
const heroSrc = `data:image/png;base64,${hero.toString("base64")}`;

// alt는 언어를 탄다 — 공유 카드의 그림 설명이 한국어로 나가면 영어 화면과 어긋난다.
// 정적 alt 대신 이 함수를 쓰는 이유는 여기서만 params를 받을 수 있기 때문이다.
export function generateImageMetadata({ params }: { params: { lang: string } }) {
  const locale = isLocale(params.lang) ? params.lang : DEFAULT_LOCALE;
  return [{ id: "default", alt: getDictionary(locale).site.ogTitle, size, contentType }];
}

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          // 공유 그림에는 다크모드가 없다. .home-hero 틴트를 라이트 기준으로 고정한 값이다.
          backgroundImage: "linear-gradient(160deg, #eaf6fc, #fdf3e4)",
        }}
      >
        <div
          style={{
            width: 560,
            height: 560,
            borderRadius: 280,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#ffffff",
          }}
        >
          {/* 원본 크기 그대로 — 확대하지 않으므로 흐려지지 않는다. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={heroSrc} alt="" width={425} height={497} />
        </div>
      </div>
    ),
    size,
  );
}
