"use client";

import { useSyncExternalStore } from "react";

// 상단바의 '화면 밝기' 버튼. welflows.com과 같은 자리·같은 모양이다.
//
// 시스템 → 밝게 → 어둡게를 돌아가며 고른다. '시스템'이 따로 있는 이유는, 한 번
// 눌러 본 사람이 다시 기기 설정을 따르게 되돌릴 길이 있어야 하기 때문이다.
// 고른 값은 <html data-theme>으로 적히고 globals.css의 [data-theme] 블록이 받는다.

export const THEME_STORAGE_KEY = "yptrip-theme";

/** 첫 그림이 칠해지기 전에 저장된 값을 <html>에 올리는 스크립트 (layout.tsx가 심는다). */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

type Theme = "system" | "light" | "dark";

const NEXT: Record<Theme, Theme> = { system: "light", light: "dark", dark: "system" };
const LABEL: Record<Theme, string> = { system: "시스템", light: "밝게", dark: "어둡게" };
const ICON: Record<Theme, string> = { system: "🌗", light: "☀️", dark: "🌙" };

// 고른 값은 React 바깥(localStorage와 <html>)에 산다. 버튼이 그 값을 비추기만 하도록
// useSyncExternalStore로 읽는다 — 찜 목록(src/lib/favorites.ts)과 같은 방식이다.
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  // 다른 탭에서 바꾼 것도 따라간다.
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function getSnapshot(): Theme {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  return saved === "light" || saved === "dark" ? saved : "system";
}

// 서버에는 고른 값이 없다 — 시스템 설정을 따르는 상태로 그린다.
function getServerSnapshot(): Theme {
  return "system";
}

function apply(next: Theme) {
  if (next === "system") {
    localStorage.removeItem(THEME_STORAGE_KEY);
    delete document.documentElement.dataset.theme;
  } else {
    localStorage.setItem(THEME_STORAGE_KEY, next);
    document.documentElement.dataset.theme = next;
  }
  for (const listener of listeners) listener();
}

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <button
      type="button"
      onClick={() => apply(NEXT[theme])}
      aria-label={`화면 밝기: ${LABEL[theme]} — 눌러서 ${LABEL[NEXT[theme]]}로`}
      className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-[var(--radius-button)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-xs text-[var(--color-muted)] hover:border-[var(--color-subtle)] hover:text-[var(--foreground)]"
    >
      <span aria-hidden>{ICON[theme]}</span>
      <span className="hidden sm:inline">화면 밝기</span>
    </button>
  );
}
