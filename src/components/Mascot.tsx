import Image from "next/image";

// 평안이(public/character/) 그림을 화면에 올리는 단 하나의 통로.
//
// alt를 prop으로 받지 않는다 — 그림은 모두 장식이고 뜻은 옆 글자가 나른다.
// 호출하는 쪽에서 실수로 읽히게 만들 수 없도록 alt=""를 여기서 고정한다.
//
// 로컬 파일이라 next/image를 쓴다 (외부 호스트 사진에 쓰는 <img> + eslint-disable
// 관례는 remotePatterns에 열거할 수 없는 TourAPI·네이버 전용).
// Next 16에서 priority는 deprecated라, 급한 그림은 문서 권고대로
// loading="eager" + fetchPriority="high"로 처리한다.

export type MascotExpression = "hero" | "heart" | "calm" | "happy" | "smile" | "wink" | "wow";

// 표시 크기를 자유 숫자가 아니라 이 목록으로 묶는 건 캐시 때문이다. 이미지 최적화
// URL이 (파일, 너비) 몇 쌍으로 고정돼, 화면을 옮겨 다녀도 같은 파일을 다시 받지 않는다.
export type MascotSize = 24 | 32 | 44 | 56 | 72 | 96 | 160;

const ART = {
  hero: { src: "/character/hero.png", width: 425, height: 497 },
  heart: { src: "/character/pose-heart.png", width: 117, height: 159 },
  calm: { src: "/character/face-calm.png", width: 147, height: 128 },
  happy: { src: "/character/face-happy.png", width: 149, height: 127 },
  smile: { src: "/character/face-smile.png", width: 148, height: 125 },
  wink: { src: "/character/face-wink.png", width: 151, height: 131 },
  wow: { src: "/character/face-wow.png", width: 151, height: 132 },
} as const satisfies Record<MascotExpression, { src: string; width: number; height: number }>;

// 그림마다 또렷하게 보이는 상한이 다르다 — 원본 폭의 절반(2배 DPR 기준)을 넘기면
// 흐려진다. 얼굴 그림은 원본이 ~150px이라 72px까지, 하트 포즈는 117px이라 56px까지다.
// 더 크게 보여야 하면 그림을 늘리지 말고 MascotSpot으로 배경을 키운다.
// 상한을 넘겨 쓰면 빌드가 아니라 타입 검사에서 바로 걸린다.
export type CrispSize = {
  hero: MascotSize;
  heart: 24 | 32 | 44 | 56;
  calm: 24 | 32 | 44 | 56 | 72;
  happy: 24 | 32 | 44 | 56 | 72;
  smile: 24 | 32 | 44 | 56 | 72;
  wink: 24 | 32 | 44 | 56 | 72;
  wow: 24 | 32 | 44 | 56 | 72;
};

export type MascotProps<E extends MascotExpression = MascotExpression> = {
  expression: E;
  size: CrispSize[E];
  /** 다른 게 아무것도 안 보이는 화면(로딩 등)에서만. 지연 로딩을 끈다. */
  eager?: boolean;
  className?: string;
};

// Tailwind는 소스에 그대로 적힌 글자만 보므로 `w-[${size}px]`처럼 조립하면 클래스가
// 생성되지 않는다. 쓰는 크기를 전부 적어 둔다.
const WIDTH_CLASS: Record<MascotSize, string> = {
  24: "w-6",
  32: "w-8",
  44: "w-11",
  56: "w-14",
  72: "w-[72px]",
  96: "w-24",
  160: "w-40",
};

export default function Mascot<E extends MascotExpression>({
  expression,
  size,
  eager,
  className,
}: MascotProps<E>) {
  const art = ART[expression];

  return (
    <Image
      src={art.src}
      alt=""
      width={art.width}
      height={art.height}
      sizes={`${size}px`}
      {...(eager ? ({ loading: "eager", fetchPriority: "high" } as const) : null)}
      className={`h-auto shrink-0 ${WIDTH_CLASS[size]}${className ? ` ${className}` : ""}`}
    />
  );
}
