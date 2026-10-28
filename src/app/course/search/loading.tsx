import CourseLoadingScreen from "@/components/CourseLoadingScreen";

// loading.tsx는 인자를 받지 않으므로(Next 16 문서) 검색어를 그대로 보여줄 수 없다.
// headers()로 우회하면 동적 렌더가 되어 이 화면이 미리 받아지는 이점이 사라진다.
export default function Loading() {
  return (
    <CourseLoadingScreen
      title="평안이가 요청을 읽고 있어요"
      description="어떤 여행을 원하시는지 정리하고, 어울리는 장소를 고르는 중이에요."
    />
  );
}
