import CourseLoadingScreen from "@/components/CourseLoadingScreen";
import { serverDictionary } from "@/lib/i18n/server";

// loading.tsx는 인자를 받지 않으므로(Next 16 문서) 검색어를 그대로 보여줄 수 없다.
// headers()로 우회하면 동적 렌더가 되어 이 화면이 미리 받아지는 이점이 사라진다.
export default async function Loading() {
  const { loading } = await serverDictionary();

  return (
    <CourseLoadingScreen
      title={loading.search}
      description={loading.searchBody}
    />
  );
}
