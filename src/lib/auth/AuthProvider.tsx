"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  User,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase/client";
import { attachFavoritesUser } from "@/lib/favorites";
import { LOGIN_ENABLED } from "@/lib/featureFlags";

// 로그인을 보류한 동안에는 인증을 붙이지 않는다 — 켜고 끄는 건 featureFlags.ts 한 줄.
const authEnabled = LOGIN_ENABLED && isFirebaseConfigured;

// docs/prd/06-infra-deployment-prd.md §2, docs/prd/04-favorites-prd.md §7 참조.
// 로그인 상태는 Firebase Auth가 소유하고, 찜 저장소(favorites.ts)에는
// uid만 넘겨 Firestore 동기화를 켜고 끈다.
export interface AuthState {
  user: User | null;
  /** 최초 인증 상태 확인이 끝나기 전까지 true — 로그인 여부를 아직 모르는 구간. */
  loading: boolean;
  configured: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(authEnabled);
  // User 객체는 프로필을 바꿔도 같은 참조가 유지돼 상태만으로는 리렌더가 걸리지
  // 않는다 — 표시 이름을 갱신한 뒤 이 값을 올려 다시 그린다.
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!authEnabled) return;
    return onAuthStateChanged(getFirebaseAuth(), (next) => {
      setUser(next);
      setLoading(false);
      // 로그인 시 로컬 찜 → Firestore 병합 후 서버 기준으로 전환, 로그아웃 시 로컬로 복귀.
      attachFavoritesUser(next?.uid ?? null);
      if (next) void upsertUserProfile(next);
    });
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(getFirebaseAuth(), provider);
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, displayName?: string) => {
    const cred = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
    if (displayName?.trim()) {
      await updateProfile(cred.user, { displayName: displayName.trim() });
      setUser(getFirebaseAuth().currentUser);
      setRevision((v) => v + 1);
    }
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(getFirebaseAuth());
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      configured: authEnabled,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      signOut,
    }),
    // revision: User 참조가 그대로여도 프로필이 바뀌면 값을 새로 만든다.
    [user, loading, revision, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth는 AuthProvider 안에서만 사용할 수 있습니다.");
  return ctx;
}

// users/{uid} 프로필 문서 (06-infra-deployment-prd.md §3).
// 실패해도 로그인 자체는 성공 처리한다 — 찜 동기화와 무관한 부가 정보다.
async function upsertUserProfile(user: User) {
  try {
    await setDoc(
      doc(getFirebaseDb(), "users", user.uid),
      {
        email: user.email ?? null,
        displayName: user.displayName ?? null,
        photoURL: user.photoURL ?? null,
        lastLoginAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    console.warn("[auth] 사용자 프로필 저장 실패", error);
  }
}
