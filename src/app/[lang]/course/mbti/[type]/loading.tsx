import CourseLoadingScreen from "@/components/CourseLoadingScreen";

// 뼈대를 한 장만 세운다 — 큐레이션 코스가 열여섯 유형 모두 하나씩이라, 기본값 세 장을
// 세우면 코스가 들어오는 순간 두 장이 사라지며 화면이 튄다.
export default function Loading() {
  return (
    <CourseLoadingScreen
      title="성향에 맞는 코스를 고르고 있어요"
      description="잠시만 기다려 주세요."
      cards={1}
    />
  );
}
