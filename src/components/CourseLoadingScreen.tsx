import MascotSpot from "./MascotSpot";

// 코스를 만드는 동안 보여주는 화면. 에이전트 파이프라인이 15초까지 걸릴 수 있어
// (docs/prd/00-overview-prd.md KPI), 그동안 아무 반응이 없으면 눌린 줄 모른다.
//
// 바깥 상자에 role="status"만 둔다 — aria-live는 이미 그 안에 들어 있고,
// CourseDetailScreen·MapScreen의 안내문도 같은 방식이다.
// 뼈대 카드는 aria-hidden이라 스크린리더는 안내 문장 하나만 읽는다.
export default function CourseLoadingScreen({
  title,
  description,
  cards = 3,
}: {
  title: string;
  description: string;
  /** 뼈대 카드 수. 코스 상세처럼 모양이 다른 화면은 0으로 두고 안내만 보여준다. */
  cards?: number;
}) {
  return (
    <div className="loading-appear mx-auto max-w-2xl px-4 pb-6 pt-6" role="status">
      <div className="flex flex-col items-center text-center">
        {/* 기다리는 동안 유일하게 보이는 그림이라 지연 로딩하지 않는다. */}
        <MascotSpot expression="calm" size={72} eager bob />
        <p className="mt-4 text-base font-semibold">{title}</p>
        <p className="mt-1 text-sm text-[var(--color-muted)]">{description}</p>
      </div>
      {cards > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2" aria-hidden>
          {Array.from({ length: cards }, (_, i) => (
            <CourseCardSkeleton key={i} />
          ))}
        </div>
      )}
    </div>
  );
}

// CourseCard와 같은 껍데기(테두리·모서리·사진 높이)를 써서 결과가 들어올 때
// 자리가 튀지 않게 한다.
function CourseCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)]">
      <div className="skeleton-line h-40" />
      <div className="p-4">
        <div className="skeleton-line h-4 w-24 rounded-full" />
        <div className="skeleton-line mt-3 h-5 w-3/4 rounded-full" />
        <div className="skeleton-line mt-2 h-3 w-16 rounded-full" />
        <div className="mt-4 space-y-2">
          <div className="skeleton-line h-3 w-full rounded-full" />
          <div className="skeleton-line h-3 w-5/6 rounded-full" />
          <div className="skeleton-line h-3 w-2/3 rounded-full" />
        </div>
      </div>
    </div>
  );
}
