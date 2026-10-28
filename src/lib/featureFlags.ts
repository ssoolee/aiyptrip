// 보류한 기능을 화면에서만 내려 두는 스위치. 코드는 지우지 않고 이 값만 false로
// 둔다 — 다시 켤 때 한 줄이면 되고, 그동안 쌓인 Firestore 데이터도 그대로 남는다.

/**
 * 로그인(Firebase 인증 + 카카오 연동)은 2026-10-26에 보류했다.
 *
 * false일 때:
 * - 하단 내비에서 '내정보'가 빠져 3칸이 된다
 * - /login·/profile은 열리지 않는다(404)
 * - 찜 목록의 로그인 유도 배너가 사라진다
 * - 인증을 아예 띄우지 않으므로 찜은 브라우저에만 저장된다
 *   (AuthProvider가 attachFavoritesUser를 부르지 않아 Firestore 동기화가 꺼진다)
 *
 * 다시 켜려면 true로 바꾸기만 하면 된다. 카카오 로그인은 그때 REST API 키와
 * Custom Token 백엔드가 함께 필요하다 — docs/prd/06-infra-deployment-prd.md 참조.
 */
export const LOGIN_ENABLED = false;
