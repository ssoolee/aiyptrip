import Mascot, { type MascotExpression, type MascotProps, type MascotSize } from "./Mascot";

// 평안이를 연한 원형 배경 위에 올린다. 그림 원본이 작아(얼굴 ~150px) 크게 띄울 수
// 없으니, 비트맵 대신 배경을 키워서 "의도한 일러스트"로 보이게 하는 장치다.
// 빈 화면·로딩 화면처럼 그림이 주인공인 자리에 쓴다.

// 배경 지름은 그림 너비의 약 1.7배. Tailwind가 조립된 클래스를 못 보므로 전부 적는다.
const BACKDROP_CLASS: Record<MascotSize, string> = {
  24: "h-10 w-10",
  32: "h-14 w-14",
  44: "h-[76px] w-[76px]",
  56: "h-24 w-24",
  72: "h-[120px] w-[120px]",
  96: "h-[164px] w-[164px]",
  160: "h-[272px] w-[272px]",
};

export default function MascotSpot<E extends MascotExpression>({
  expression,
  size,
  eager,
  bob,
  className,
}: MascotProps<E> & {
  /** 둥실 떠 있는 움직임. 기다리는 화면에서만 쓴다 (모션 끄기 설정을 따른다). */
  bob?: boolean;
}) {
  return (
    <div
      className={`mascot-spot inline-flex items-center justify-center rounded-full ${
        BACKDROP_CLASS[size]
      }${className ? ` ${className}` : ""}`}
    >
      <Mascot
        expression={expression}
        size={size}
        eager={eager}
        className={bob ? "mascot-bob" : undefined}
      />
    </div>
  );
}
