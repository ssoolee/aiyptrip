import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// 브라우저 탭 아이콘. favicon.ico는 코드로 만들 수 없어(Next 문서) 기본 파일을 지우고
// 이 경로만 남겼다.
//
// 원본으로 face-smile.png(148px)를 쓴다 — 148 → 32는 축소라 또렷하고, 전신 그림은
// 32px에서 팔다리가 뭉개진다. 연한 물방울이 흰 탭 배경에서 사라지지 않도록
// 아이보리 바탕을 깐다(Satori 안에서는 CSS 변수가 풀리지 않아 값을 직접 적는다).
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// 경로는 소스 파일이 아니라 프로젝트 루트 기준이다.
const face = await readFile(join(process.cwd(), "public/character/face-smile.png"));
const faceSrc = `data:image/png;base64,${face.toString("base64")}`;

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          borderRadius: 6,
          background: "#fdf3e4",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={faceSrc} alt="" width={35} height={30} />
      </div>
    ),
    size,
  );
}
