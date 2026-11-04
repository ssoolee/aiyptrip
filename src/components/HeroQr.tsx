import qr from "@/lib/data/qr.json";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";

// 히어로 아래 띠에 앉는 QR — 모니터 앞에 앉은 사람이 찍어서 휴대폰으로 이어 보라는 것.
//
// **좁은 화면에서는 그리지 않는다.** 자기 화면에 뜬 QR을 자기 기기로 찍을 수는 없다.
// 1024px(lg) 위에서만 보인다 — 그 아래는 태블릿일 수 있고, 거기서도 쓸모가 없다.
//
// 그림 파일이 아니라 경로 데이터로 그린다(scripts/build-qr.ts 머리말 참조).
// 코드는 **언어마다 다르다** — /ja를 보던 사람이 찍으면 휴대폰에서도 일본어로 열린다.
//
// 바탕은 테마를 따르지 않고 늘 흰색이다. 어두운 바탕에 밝은 모듈로 뒤집으면 못 읽는
// 스캐너가 있어서, 다크모드에서도 흰 판 위에 그린다.

const CODES = qr.codes as Record<string, { url: string; size: number; path: string } | undefined>;

export default function HeroQr({ locale, label }: { locale: string; label: string }) {
  const lang: Locale = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const code = CODES[lang] ?? CODES[DEFAULT_LOCALE];
  if (!code) return null;

  return (
    <div className="ml-auto hidden shrink-0 items-center gap-2.5 rounded-[var(--radius-button)] border border-[var(--color-border)] bg-[var(--color-card)] py-1.5 pl-1.5 pr-3 lg:flex">
      <svg
        viewBox={`0 0 ${code.size} ${code.size}`}
        shapeRendering="crispEdges"
        role="img"
        aria-label={label}
        className="h-[72px] w-[72px] rounded-[6px] bg-white"
      >
        {/* 여백까지 흰색으로 채운다 — QR 바깥의 조용한 영역이 있어야 읽힌다. */}
        <path fill="#ffffff" d={`M0 0h${code.size}v${code.size}H0z`} />
        <path stroke="#000000" d={code.path} />
      </svg>
      <span className="text-xs leading-snug text-[var(--color-muted)]">{label}</span>
    </div>
  );
}
