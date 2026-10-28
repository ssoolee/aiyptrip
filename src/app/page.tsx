import HomeHero from "@/components/HomeHero";
import Mascot from "@/components/Mascot";
import HomeSteps from "@/components/HomeSteps";
import PresetGrid from "@/components/PresetGrid";
import TripSearchBox from "@/components/TripSearchBox";
import PetPlacesLink from "@/components/PetPlacesLink";

// 이 페이지에는 가로 여백(px-4)을 두지 않는다 — PresetGrid의 가로 스크롤이 화면
// 끝까지 흐르도록 각 섹션이 자기 여백을 직접 갖는 기존 규칙을 따른다.
export default function Home() {
  return (
    <div className="mx-auto max-w-2xl pb-6 pt-6">
      <div className="mb-5">
        <HomeHero />
      </div>
      <div className="mb-6">
        <TripSearchBox showExamples />
      </div>
      <PresetGrid />
      <div className="mt-4 px-4">
        <PetPlacesLink />
      </div>
      <div className="mt-6">
        <HomeSteps />
      </div>
      <p className="mt-6 flex items-center justify-center gap-2 text-xs text-[var(--color-muted)]">
        <Mascot expression="heart" size={32} />
        오늘도, 마음이 평안한 양평 💙
      </p>
    </div>
  );
}
