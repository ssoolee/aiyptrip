import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// 홈 화면에 추가했을 때 쓰는 아이콘. 180px은 얼굴 그림(~150px)으로는 확대가 되므로
// 전신 그림(425×497)을 줄여 쓴다. 비율 425/497 = 0.855 → 137×160 (오차 0.1%).
// iOS가 투명 배경을 검게 합성하므로 바탕색을 반드시 채운다.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const hero = await readFile(join(process.cwd(), "public/character/hero.png"));
const heroSrc = `data:image/png;base64,${hero.toString("base64")}`;

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fdf3e4",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={heroSrc} alt="" width={137} height={160} />
      </div>
    ),
    size,
  );
}
