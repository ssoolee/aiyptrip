import CourseLoadingScreen from "@/components/CourseLoadingScreen";
import { serverDictionary } from "@/lib/i18n/server";

// 뼈대를 한 장만 세운다 — 큐레이션 코스가 열여섯 유형 모두 하나씩이라, 기본값 세 장을
// 세우면 코스가 들어오는 순간 두 장이 사라지며 화면이 튄다.
export default async function Loading() {
  const { loading } = await serverDictionary();

  return (
    <CourseLoadingScreen
      title={loading.mbti}
      description={loading.wait}
      cards={1}
    />
  );
}
