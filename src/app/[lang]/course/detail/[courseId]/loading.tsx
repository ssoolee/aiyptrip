import CourseLoadingScreen from "@/components/CourseLoadingScreen";
import { serverDictionary } from "@/lib/i18n/server";

// 저장해 둔 코스를 읽어오는 것뿐이라 보통 1초 안에 끝난다. 모양도 코스 목록과 달라
// 뼈대 카드 없이 안내만 둔다.
export default async function Loading() {
  const { loading } = await serverDictionary();

  return (
    <CourseLoadingScreen
      title={loading.detail}
      description={loading.wait}
      cards={0}
    />
  );
}
