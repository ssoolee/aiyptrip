import HomeHero from "@/components/HomeHero";
import HomeSteps from "@/components/HomeSteps";
import PresetGrid from "@/components/PresetGrid";
import PyeonganiCard from "@/components/PyeonganiCard";
import SectionHead from "@/components/SectionHead";
import TripSearchBox from "@/components/TripSearchBox";
import PetPlacesLink from "@/components/PetPlacesLink";

// 이 페이지에는 가로 여백(px-4)을 두지 않는다 — PresetGrid의 가로 스크롤이 화면
// 끝까지 흐르도록 각 섹션이 자기 여백을 직접 갖는 기존 규칙을 따른다.
export default function Home() {
  return (
    <div className="mx-auto max-w-2xl pb-2 pt-6">
      <HomeHero />

      <div className="mt-8">
        <SectionHead
          className="mb-3 px-4"
          expression="wow"
          title="어떤 여행을 떠나볼까요?"
          description="하고 싶은 여행을 그대로 적어 보세요."
        />
        <TripSearchBox showExamples />
      </div>

      <div className="mt-9">
        <SectionHead
          className="mb-3 px-4"
          expression="smile"
          title="유형으로 골라보기"
          description="고르면 바로 코스를 만들어요."
        />
        <PresetGrid />
        <div className="mt-3 px-4">
          <PetPlacesLink />
        </div>
      </div>

      <div className="mt-9">
        <SectionHead
          className="mb-3 px-4"
          expression="happy"
          title="평안이가 코스를 짜는 방법"
          description="세 걸음이면 끝나요."
        />
        <HomeSteps />
      </div>

      <div className="mt-10">
        <PyeonganiCard />
      </div>
    </div>
  );
}
