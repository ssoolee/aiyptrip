import HomeHero from "@/components/HomeHero";
import HomeSteps from "@/components/HomeSteps";
import PresetGrid from "@/components/PresetGrid";
import PyeonganiCard from "@/components/PyeonganiCard";
import SectionHead from "@/components/SectionHead";
import TripSearchBox from "@/components/TripSearchBox";
import PetPlacesLink from "@/components/PetPlacesLink";
import TopPlaces from "@/components/TopPlaces";
import { lang } from "next/root-params";
import { getTopPlaces } from "@/lib/topPlaces";
import { canGenerateCourses, DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";

// 이 페이지에는 가로 여백(px-4)을 두지 않는다 — PresetGrid의 가로 스크롤이 화면
// 끝까지 흐르도록 각 섹션이 자기 여백을 직접 갖는 기존 규칙을 따른다.
export default async function Home() {
  // 아직 만들지 않았으면(npm run build:top) 빈 배열 — TopPlaces가 영역을 접는다.
  const top = getTopPlaces();
  const segment = await lang();
  const locale = segment && isLocale(segment) ? segment : DEFAULT_LOCALE;
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
            title="어떤 여행을 떠나볼까요?"
            description="하고 싶은 여행을 그대로 적어 보세요."
          />
          <TripSearchBox showExamples />
        </div>
      )}

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

      {(top.cafe.length > 0 ||
        top.restaurant.length > 0 ||
        top.recentCafe.length > 0 ||
        top.recentRestaurant.length > 0) && (
        <div className="mt-9">
          <SectionHead
            className="mb-3 px-4"
            expression="wink"
            title="요즘 이야기가 많은 곳"
            description={`네이버 블로그에 글이 많이 올라온 양평 카페·맛집이에요. 최근 ${top.recentDays}일과 전체 기간을 따로 보여드려요.`}
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
