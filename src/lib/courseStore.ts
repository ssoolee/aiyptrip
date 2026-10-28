import { getAdminDb } from "@/lib/firebase/admin";
import { Course } from "@/types/travel";

// 생성된 코스를 서버에 남겨 URL만으로 다시 열 수 있게 한다.
// 컬렉션은 firestore.rules가 미리 열어 둔 precomputedCourses — 누구나 읽고, 쓰기는
// 서버(Admin SDK)만 한다. Admin SDK는 보안 규칙을 거치지 않으므로 규칙 변경이 없다.
const COLLECTION = "precomputedCourses";
// 추천 코스는 그때그때 만든 결과라 오래 둘 이유가 없다. expiresAt에 Firestore TTL 정책을
// 걸면 지난 문서가 자동으로 지워진다 (설정 방법은 README "코스 저장" 참조).
const TTL_DAYS = 30;
// orchestrator가 짓는 ID 형식(preset_offset_base36)과 큐레이션 ID만 받는다. 경로 구분자가
// 섞인 값으로 doc()을 부르면 예외가 난다.
const SAFE_ID = /^[A-Za-z0-9_-]{1,200}$/;

/** 생성한 코스를 저장한다. 실패해도 화면 동작에는 영향이 없다. */
export async function saveCourses(courses: Course[]): Promise<void> {
  const db = getAdminDb();
  const savable = courses.filter((course) => SAFE_ID.test(course.courseId));
  if (!db || savable.length === 0) return;

  try {
    const batch = db.batch();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + TTL_DAYS * 24 * 60 * 60 * 1000);
    for (const course of savable) {
      batch.set(db.collection(COLLECTION).doc(course.courseId), { ...course, savedAt: now, expiresAt });
    }
    await batch.commit();
  } catch (error) {
    console.warn("[courseStore] 코스 저장 실패 — 화면 동작에는 영향이 없습니다.", error);
  }
}

/** 저장된 코스를 읽는다. 없거나 읽지 못하면 null. */
export async function loadCourse(courseId: string): Promise<Course | null> {
  const db = getAdminDb();
  if (!db || !SAFE_ID.test(courseId)) return null;

  try {
    const snapshot = await db.collection(COLLECTION).doc(courseId).get();
    if (!snapshot.exists) return null;
    // savedAt·expiresAt은 Firestore Timestamp라 클라이언트 컴포넌트로 넘길 수 없다. 떼어 낸다.
    const { savedAt, expiresAt, ...course } = snapshot.data() as Course & {
      savedAt?: unknown;
      expiresAt?: unknown;
    };
    void savedAt;
    void expiresAt;
    return course;
  } catch (error) {
    console.warn("[courseStore] 코스 조회 실패 — 세션에 남은 코스로 대신합니다.", error);
    return null;
  }
}
