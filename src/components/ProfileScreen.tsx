"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import Mascot, { type MascotExpression } from "@/components/Mascot";
import MascotSpot from "@/components/MascotSpot";
import PageHeader from "@/components/PageHeader";
import {
  getFavoritePlacesServerSnapshot,
  getFavoritePlacesSnapshot,
  getFavoritesServerSnapshot,
  getFavoritesSnapshot,
  subscribeFavoritePlaces,
  subscribeFavorites,
} from "@/lib/favorites";

export default function ProfileScreen() {
  const { user, loading, configured, signOut } = useAuth();
  const favorites = useSyncExternalStore(
    subscribeFavorites,
    getFavoritesSnapshot,
    getFavoritesServerSnapshot,
  );
  const favoritePlaces = useSyncExternalStore(
    subscribeFavoritePlaces,
    getFavoritePlacesSnapshot,
    getFavoritePlacesServerSnapshot,
  );

  if (!configured) {
    return (
      <Centered expression="smile" title="로그인 기능 준비 중">
        Firebase 설정값(<code>NEXT_PUBLIC_FIREBASE_*</code>)이 채워지면 로그인하고 찜 목록을
        여러 기기에서 동기화할 수 있어요. (docs/prd/06-infra-deployment-prd.md)
      </Centered>
    );
  }

  if (loading) {
    return (
      <Centered expression="calm" title="불러오는 중…">
        잠시만 기다려 주세요.
      </Centered>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <MascotSpot expression="heart" size={56} className="mb-3" />
        <h1 className="mb-2 text-lg font-bold">로그인하면 찜이 안 사라져요</h1>
        <p className="mb-6 text-sm text-[var(--color-muted)]">
          지금 찜한 코스 {favorites.length}개, 장소 {favoritePlaces.length}개는 이 브라우저에만
          저장돼 있어요.
          <br />
          로그인하면 계정으로 옮겨서 다른 기기에서도 볼 수 있어요.
        </p>
        <Link
          href="/login"
          className="inline-flex min-h-[48px] items-center justify-center rounded-[var(--radius-button)] bg-[var(--color-primary)] px-6 text-sm font-semibold text-white"
        >
          로그인 / 회원가입
        </Link>
      </div>
    );
  }

  const name = user.displayName?.trim() || user.email?.split("@")[0] || "여행자";

  return (
    <div className="mx-auto max-w-2xl px-4 pb-6 pt-8">
      <PageHeader className="mb-4" title="내정보" expression="happy" />

      <div className="mb-4 flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        {user.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.photoURL} alt="" className="h-12 w-12 rounded-full object-cover" />
        ) : (
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)]/10">
            <Mascot expression="smile" size={32} />
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate font-semibold">{name}</p>
          <p className="truncate text-xs text-[var(--color-muted)]">{user.email}</p>
        </div>
      </div>

      <Link
        href="/favorites"
        className="mb-4 flex items-center justify-between rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-sm"
      >
        <span className="font-medium">찜 목록</span>
        <span className="text-[var(--color-muted)]">
          코스 {favorites.length} · 장소 {favoritePlaces.length} →
        </span>
      </Link>

      <p className="mb-4 text-xs text-[var(--color-muted)]">
        찜한 코스와 장소는 계정에 저장돼 다른 기기에서도 그대로 보여요.
      </p>

      <button
        type="button"
        onClick={() => void signOut()}
        className="min-h-[48px] w-full rounded-[var(--radius-button)] border border-[var(--color-border)] bg-[var(--color-card)] text-sm font-semibold"
      >
        로그아웃
      </button>
    </div>
  );
}

function Centered({
  expression,
  title,
  children,
}: {
  expression: MascotExpression;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center justify-center px-4 py-20 text-center">
      <MascotSpot expression={expression} size={56} className="mb-3" />
      <h1 className="mb-2 text-lg font-bold">{title}</h1>
      <p className="text-sm text-[var(--color-muted)]">{children}</p>
    </div>
  );
}
