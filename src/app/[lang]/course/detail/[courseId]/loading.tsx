import CourseLoadingScreen from "@/components/CourseLoadingScreen";

// 저장해 둔 코스를 읽어오는 것뿐이라 보통 1초 안에 끝난다. 모양도 코스 목록과 달라
// 뼈대 카드 없이 안내만 둔다.
export default function Loading() {
  return (
    <CourseLoadingScreen
      title="코스를 불러오는 중이에요"
      description="잠시만 기다려 주세요."
      cards={0}
    />
  );
}
