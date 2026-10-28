"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { authErrorMessage } from "@/lib/auth/errors";
import MascotSpot from "@/components/MascotSpot";

type Mode = "signin" | "signup";

export default function LoginForm() {
  const router = useRouter();
  const { user, loading, configured, signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // 이미 로그인된 상태로 들어오면 내정보로 보낸다.
  useEffect(() => {
    if (!loading && user) router.replace("/profile");
  }, [loading, user, router]);

  if (!configured) {
    return (
      <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-border)] p-6 text-center">
        <MascotSpot expression="calm" size={56} className="mb-3" />
        <p className="text-sm text-[var(--color-muted)]">
          Firebase 설정값(<code>NEXT_PUBLIC_FIREBASE_*</code>)이 없어 로그인을 사용할 수 없어요.
          <br />
          <code>.env.local</code>에 값을 채우면 바로 켜집니다.
        </p>
      </div>
    );
  }

  async function run(action: () => Promise<void>) {
    setError(null);
    setPending(true);
    try {
      await action();
      router.replace("/profile");
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-5">
      <button
        type="button"
        disabled={pending}
        onClick={() => run(signInWithGoogle)}
        className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[var(--radius-button)] border border-[var(--color-border)] bg-[var(--color-card)] px-4 text-sm font-semibold disabled:opacity-50"
      >
        <GoogleMark />
        Google로 계속하기
      </button>

      <div className="flex items-center gap-3 text-xs text-[var(--color-muted)]">
        <span className="h-px flex-1 bg-[var(--color-border)]" />
        또는 이메일로
        <span className="h-px flex-1 bg-[var(--color-border)]" />
      </div>

      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          run(() =>
            mode === "signin"
              ? signInWithEmail(email.trim(), password)
              : signUpWithEmail(email.trim(), password, displayName),
          );
        }}
      >
        {mode === "signup" && (
          <Field
            label="이름"
            type="text"
            value={displayName}
            autoComplete="name"
            placeholder="여행자"
            onChange={setDisplayName}
          />
        )}
        <Field
          label="이메일"
          type="email"
          value={email}
          required
          autoComplete="email"
          placeholder="you@example.com"
          onChange={setEmail}
        />
        <Field
          label="비밀번호"
          type="password"
          value={password}
          required
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          placeholder={mode === "signup" ? "6자 이상" : ""}
          onChange={setPassword}
        />

        {error && (
          <p role="alert" className="text-sm text-[#c0392b]">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="min-h-[48px] w-full rounded-[var(--radius-button)] bg-[var(--color-primary)] px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "처리 중…" : mode === "signin" ? "로그인" : "회원가입"}
        </button>
      </form>

      <p className="text-center text-sm text-[var(--color-muted)]">
        {mode === "signin" ? "계정이 없으세요?" : "이미 계정이 있으세요?"}{" "}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
          }}
          className="font-semibold text-[var(--color-primary)] underline"
        >
          {mode === "signin" ? "회원가입" : "로그인"}
        </button>
      </p>

      <p className="text-center text-xs text-[var(--color-muted)]">
        카카오 로그인은 준비 중이에요.
      </p>
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  required,
  autoComplete,
  placeholder,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-[var(--color-muted)]">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[48px] w-full rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm outline-none focus:border-[var(--color-primary)]"
      />
    </label>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.33A8.99 8.99 0 0 0 9 18Z"
      />
      <path fill="#FBBC05" d="M3.97 10.71A5.41 5.41 0 0 1 3.97 7.3V4.96H.96a9 9 0 0 0 0 8.08l3.01-2.33Z" />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A8.99 8.99 0 0 0 .96 4.96L3.97 7.3C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}
