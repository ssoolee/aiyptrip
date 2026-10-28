"use client";

import { FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import { Auth, getAuth } from "firebase/auth";
import { Firestore, getFirestore } from "firebase/firestore";

// docs/prd/06-infra-deployment-prd.md §2 — 인증은 Firebase Authentication,
// 찜 저장은 Cloud Firestore. 아래 값은 모두 NEXT_PUBLIC_ 이라 브라우저에
// 노출되지만 Firebase 웹 설정은 공개 전제 값이다(보안은 Security Rules 담당).
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// 설정값이 비어 있어도(로컬에 .env.local을 안 채운 경우) 앱 전체가 죽지 않도록
// 초기화를 지연시키고, 로그인 UI는 "설정 필요" 상태로 비활성화한다.
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId,
);

function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase 설정값(NEXT_PUBLIC_FIREBASE_*)이 없습니다.");
  }
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

export function getFirebaseDb(): Firestore {
  return getFirestore(getFirebaseApp());
}
