"use client";

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { Category, Course, Place } from "@/types/travel";

// docs/prd/04-favorites-prd.md §5 데이터 모델 구현.
// 찜은 두 종류다(04 §3) — 코스 찜과 장소 찜. 비로그인: localStorage만 사용.
// 로그인: 로컬 데이터를 Firestore users/{uid}/favoriteCourses·favoritePlaces 로
// 1회 병합한 뒤 서버 기준으로 동기화(06-infra-deployment-prd.md §3).
// 두 종류가 저장 키와 컬렉션 이름만 다르고 동작이 같아, 스토어 하나를 두 번 만들어 쓴다.

export interface FavoriteCourseEntry {
  courseId: string;
  title: string;
  presetType: string;
  savedAt: string;
  itinerarySnapshot: Course;
}

export interface FavoritePlaceEntry {
  placeId: string;
  name: string;
  category: Category;
  savedAt: string;
  // 코스 찜과 같은 이유로 찜한 시점의 정보를 남긴다 — 스냅샷이 바뀌어도 목록이 비지 않는다.
  placeSnapshot: Place;
}

interface FavoriteStore<T> {
  attachUser: (uid: string | null) => void;
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => T[];
  getServerSnapshot: () => T[];
  has: (id: string) => boolean;
  /** 이미 있으면 지우고 false, 없으면 넣고 true — 하트 버튼 하나로 토글한다. */
  toggle: (id: string, create: () => T) => boolean;
  remove: (id: string) => void;
}

function createFavoriteStore<T extends { savedAt: string }>(config: {
  storageKey: string;
  collectionName: string;
  idOf: (entry: T) => string;
}): FavoriteStore<T> {
  const { storageKey, collectionName, idOf } = config;
  const listeners = new Set<() => void>();
  // 로그인 중인 사용자. null이면 로컬 저장소만 쓴다.
  let currentUid: string | null = null;
  let unsubscribeRemote: (() => void) | null = null;

  function readFromStorage(): T[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as T[]) : [];
    } catch {
      return [];
    }
  }

  let cache: T[] = readFromStorage();

  function persist(entries: T[]) {
    cache = entries;
    // 로그인 상태에서도 로컬 미러를 유지한다 — 로그아웃 후에도 목록이 남고,
    // Firestore 쓰기가 실패해도 데이터가 사라지지 않는다(04 §8).
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, JSON.stringify(entries));
    }
    listeners.forEach((listener) => listener());
  }

  function userCollection(uid: string) {
    return collection(getFirebaseDb(), "users", uid, collectionName);
  }

  /**
   * 로컬에만 있는 찜을 서버로 올린다. 서버에 이미 같은 id가 있으면 찜한 시점의
   * 스냅샷을 덮어쓰지 않도록 건너뛴다(합집합, 04 §4 Must).
   * 반환값은 올리지 못한 로컬 찜 — 다음 로그인에서 다시 시도한다.
   */
  async function mergeLocalIntoRemote(uid: string): Promise<T[]> {
    const local = readFromStorage();
    if (local.length === 0) return [];
    try {
      const remote = await getDocs(userCollection(uid));
      const remoteIds = new Set(remote.docs.map((d) => d.id));
      const toUpload = local.filter((entry) => !remoteIds.has(idOf(entry)));
      if (toUpload.length === 0) return [];
      const batch = writeBatch(getFirebaseDb());
      toUpload.forEach((entry) => batch.set(doc(userCollection(uid), idOf(entry)), entry));
      await batch.commit();
      return [];
    } catch (error) {
      // 병합 실패 시 로컬 데이터를 그대로 유지한다(04 §8) — 다음 로그인에서 재시도.
      console.warn(`[favorites] 로컬 → Firestore 병합 실패 (${collectionName})`, error);
      return local;
    }
  }

  const EMPTY: T[] = [];

  function attachUser(uid: string | null) {
    if (uid === currentUid) return;
    unsubscribeRemote?.();
    unsubscribeRemote = null;
    currentUid = uid;

    if (!uid) {
      persist(readFromStorage());
      return;
    }

    void mergeLocalIntoRemote(uid).then((pending) => {
      // 병합이 실패해도 구독은 건다 — 서버에 이미 있는 찜은 보여줘야 한다.
      if (currentUid !== uid) return;
      unsubscribeRemote = onSnapshot(
        userCollection(uid),
        (snap) => {
          const entries = snap.docs.map((d) => d.data() as T);
          // 올리지 못한 로컬 찜은 서버 목록에 얹어 유지한다 — 서버 스냅샷으로
          // 로컬 미러를 덮어쓰면서 데이터가 사라지지 않도록(04 §8).
          const remoteIds = new Set(entries.map(idOf));
          const merged = [...entries, ...pending.filter((e) => !remoteIds.has(idOf(e)))];
          persist(merged.sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1)));
        },
        (error) => console.warn(`[favorites] Firestore 구독 실패 (${collectionName})`, error),
      );
    });
  }

  function remove(id: string) {
    persist(cache.filter((e) => idOf(e) !== id));
    if (currentUid) {
      const uid = currentUid;
      void deleteDoc(doc(userCollection(uid), id)).catch((error) =>
        console.warn(`[favorites] 찜 취소 실패 (${collectionName})`, error),
      );
    }
  }

  function toggle(id: string, create: () => T): boolean {
    if (cache.some((e) => idOf(e) === id)) {
      remove(id);
      return false;
    }
    // 낙관적 업데이트(04 §8) — 화면은 즉시 바꾸고 서버 쓰기는 뒤따라간다.
    const entry = create();
    persist([entry, ...cache]);
    if (currentUid) {
      const uid = currentUid;
      void setDoc(doc(userCollection(uid), id), entry).catch((error) =>
        console.warn(`[favorites] 찜 저장 실패 (${collectionName})`, error),
      );
    }
    return true;
  }

  return {
    attachUser,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => cache,
    getServerSnapshot: () => EMPTY,
    has: (id) => cache.some((e) => idOf(e) === id),
    toggle,
    remove,
  };
}

const courseStore = createFavoriteStore<FavoriteCourseEntry>({
  storageKey: "ypaicourse.favorites.courses",
  collectionName: "favoriteCourses",
  idOf: (entry) => entry.courseId,
});

const placeStore = createFavoriteStore<FavoritePlaceEntry>({
  storageKey: "ypaicourse.favorites.places",
  collectionName: "favoritePlaces",
  idOf: (entry) => entry.placeId,
});

/**
 * 로그인/로그아웃 시 호출한다(AuthProvider).
 * 로그인: 로컬 찜을 Firestore에 합집합으로 병합한 뒤 서버 스냅샷을 구독한다.
 * 로그아웃: 구독을 끊고 로컬 저장소 기준으로 되돌린다.
 */
export function attachFavoritesUser(uid: string | null) {
  courseStore.attachUser(uid);
  placeStore.attachUser(uid);
}

export const subscribeFavorites = courseStore.subscribe;
export const getFavoritesSnapshot = courseStore.getSnapshot;
export const getFavoritesServerSnapshot = courseStore.getServerSnapshot;

export function isFavoriteCourse(courseId: string): boolean {
  return courseStore.has(courseId);
}

export function toggleFavoriteCourse(course: Course): boolean {
  return courseStore.toggle(course.courseId, () => ({
    courseId: course.courseId,
    title: course.title,
    presetType: course.presetType,
    savedAt: new Date().toISOString(),
    itinerarySnapshot: course,
  }));
}

export function removeFavoriteCourse(courseId: string) {
  courseStore.remove(courseId);
}

export const subscribeFavoritePlaces = placeStore.subscribe;
export const getFavoritePlacesSnapshot = placeStore.getSnapshot;
export const getFavoritePlacesServerSnapshot = placeStore.getServerSnapshot;

export function isFavoritePlace(placeId: string): boolean {
  return placeStore.has(placeId);
}

// 코스 스팟(ItineraryStop)이 들어오면 시간대·추천 이유가 붙어 있다 — 장소 찜은
// 코스와 무관하므로(04 §3) 떼어 낸다. Firestore는 값이 undefined인 필드를 거부하므로
// (전화번호·평점이 없는 장소가 많다) 빈 필드도 함께 지운다.
export function toPlaceSnapshot(place: Place): Place {
  const snapshot: Record<string, unknown> = { ...place };
  delete snapshot["timeSlot"];
  delete snapshot["reason"];
  for (const key of Object.keys(snapshot)) {
    if (snapshot[key] === undefined) delete snapshot[key];
  }
  return snapshot as unknown as Place;
}

export function toggleFavoritePlace(place: Place): boolean {
  return placeStore.toggle(place.placeId, () => ({
    placeId: place.placeId,
    name: place.name,
    category: place.category,
    savedAt: new Date().toISOString(),
    placeSnapshot: toPlaceSnapshot(place),
  }));
}

export function removeFavoritePlace(placeId: string) {
  placeStore.remove(placeId);
}
