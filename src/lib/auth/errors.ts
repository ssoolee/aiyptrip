// Firebase Auth 오류 코드를 사용자에게 보여줄 한국어 문구로 바꾼다.
// 코드 목록: https://firebase.google.com/docs/reference/js/auth#autherrorcodes
const MESSAGES: Record<string, string> = {
  "auth/invalid-email": "이메일 형식이 올바르지 않아요.",
  "auth/missing-password": "비밀번호를 입력해 주세요.",
  "auth/weak-password": "비밀번호는 6자 이상이어야 해요.",
  "auth/email-already-in-use": "이미 가입된 이메일이에요. 로그인해 주세요.",
  "auth/invalid-credential": "이메일 또는 비밀번호가 맞지 않아요.",
  "auth/wrong-password": "이메일 또는 비밀번호가 맞지 않아요.",
  "auth/user-not-found": "가입된 계정이 없어요. 회원가입을 먼저 해주세요.",
  "auth/too-many-requests": "시도가 너무 많아요. 잠시 후 다시 시도해 주세요.",
  "auth/network-request-failed": "네트워크 연결을 확인해 주세요.",
  "auth/popup-closed-by-user": "로그인 창이 닫혔어요. 다시 시도해 주세요.",
  "auth/cancelled-popup-request": "로그인 창이 닫혔어요. 다시 시도해 주세요.",
  "auth/popup-blocked": "브라우저가 로그인 창을 막았어요. 팝업을 허용해 주세요.",
  "auth/configuration-not-found":
    "Firebase 콘솔에서 Authentication을 아직 시작하지 않았어요. (Authentication → 시작하기)",
  "auth/invalid-api-key": "Firebase 설정값(NEXT_PUBLIC_FIREBASE_API_KEY)이 올바르지 않아요.",
  "auth/operation-not-allowed":
    "Firebase 콘솔에서 해당 로그인 방법이 아직 켜져 있지 않아요. (Authentication → Sign-in method)",
  "auth/unauthorized-domain":
    "Firebase 콘솔의 승인된 도메인에 이 주소가 등록되어 있지 않아요. (Authentication → Settings)",
};

export function authErrorMessage(error: unknown): string {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  return MESSAGES[code] ?? "로그인에 실패했어요. 잠시 후 다시 시도해 주세요.";
}
