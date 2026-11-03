import HomeHero from "@/components/HomeHero";
import HomeSteps from "@/components/HomeSteps";
import PresetGrid from "@/components/PresetGrid";
import PyeonganiCard from "@/components/PyeonganiCard";
import SectionHead from "@/components/SectionHead";
import TripSearchBox from "@/components/TripSearchBox";
import PetPlacesLink from "@/components/PetPlacesLink";
import TopPlaces from "@/components/TopPlaces";
import { getTopPlaces } from "@/lib/topPlaces";
import { canGenerateCourses } from "@/lib/i18n/config";
import { fill } from "@/lib/i18n/format";
import { currentLocale, serverDictionary } from "@/lib/i18n/server";

// 이 페이지에는 가로 여백(px-4)을 두지 않는다 — PresetGrid의 가로 스크롤이 화면
// 끝까지 흐르도록 각 섹션이 자기 여백을 직접 갖는 기존 규칙을 따른다.
export default async function Home() {
  const [locale, { home }] = await Promise.all([currentLocale(), serverDictionary()]);
  // 아직 만들지 않았으면(npm run build:top) 빈 배열 — TopPlaces가 영역을 접는다.
  const top = getTopPlaces(locale);
  // 자연어 검색은 실시간 생성이라 한국어로만 답한다 (src/lib/i18n/config.ts).
  const canSearch = canGenerateCourses(locale);

  return (
    <div className="page-width pb-2 pt-6">
      <HomeHero />

      {canSearch && (
        <div className="mt-8">
          <SectionHead
            className="mb-3 px-4"
            expression="wow"
            title={home.searchTitle}
            description={home.searchDescription}
          />
          <TripSearchBox showExamples />
        </div>
      )}

      <div className="mt-9">
        <SectionHead
          className="mb-3 px-4"
          expression="smile"
          title={home.presetTitle}
          description={home.presetDescription}
        />
        <PresetGrid />
        <div className="mt-3 px-4">
          <PetPlacesLink />
        </div>
      </div>

      {(top.cafe.length > 0 ||
        top.restaurant.length > 0 ||
        top.recentCafe.length > 0 ||
        top.recentRestaurant.length > 0) && (
        <div className="mt-9">
          <SectionHead
            className="mb-3 px-4"
            expression="wink"
            title={home.topTitle}
            description={fill(home.topDescription, { days: top.recentDays })}
          />
          <div className="px-4">
            <TopPlaces
              cafe={top.cafe}
              restaurant={top.restaurant}
              recentCafe={top.recentCafe}
              recentRestaurant={top.recentRestaurant}
              recentDays={top.recentDays}
            />
          </div>
        </div>
      )}

      <div className="mt-9">
        <SectionHead
          className="mb-3 px-4"
          expression="happy"
          title={home.stepsTitle}
          description={home.stepsDescription}
        />
        <HomeSteps />
      </div>

      <div className="mt-10">
        <PyeonganiCard />
      </div>
    </div>
  );
}
