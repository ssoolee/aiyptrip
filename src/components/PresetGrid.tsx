import Link from "next/link";
import Mascot from "./Mascot";
import { PRESETS } from "@/lib/presets";

export default function PresetGrid() {
  return (
    <>
      {/* 제목은 여백 안에, 카드 줄은 화면 끝까지 — 모바일 가로 스와이프를 위해 분리한다. */}
      <h2 className="mb-2 flex items-center gap-2 px-4 text-sm font-semibold">
        <Mascot expression="smile" size={24} />
        유형으로 골라볼까요?
      </h2>
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible">
        {PRESETS.map((preset) => (
          <Link
            key={preset.type}
            href={`/course/${preset.type}`}
            className="flex min-w-[132px] shrink-0 flex-col items-center gap-2 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-center transition hover:border-[var(--color-primary)] sm:min-w-0"
          >
            <span className="text-3xl" aria-hidden>
              {preset.emoji}
            </span>
            <span className="text-sm font-semibold">{preset.label}</span>
            <span className="text-xs text-[var(--color-muted)]">{preset.description}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
