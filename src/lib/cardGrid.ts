// 카드 묶음(코스 카드·숙소 추천·로딩 뼈대)이 함께 쓰는 그리드 클래스.
//
// 본문 폭이 데스크톱에서 1280px까지 넓어지면서(src/app/globals.css의 .page-width),
// 카드가 열 수보다 적을 때 왼쪽 끝에 붙고 오른쪽이 통째로 비는 것이 눈에 띄게 됐다.
// MBTI 유형 화면은 열여섯 유형 모두 큐레이션 코스도 숙소도 하나씩이라 늘 이 경우다.
//
// 카드를 늘려 폭을 채우지는 않는다 — 한 장을 1280px로 늘리면 표지 사진과 글줄이
// 지나치게 벌어져 오히려 보기 나쁘다. 카드 크기는 세 열일 때(약 400px)와 같게 두고
// 묶음을 가운데로 모은다. 그래서 상한도 25rem(한 장)·51rem(두 장 + 간격 1rem)이다.
//
// Tailwind는 소스에 그대로 적힌 글자만 보므로 클래스를 조립하지 않고 전부 적어 둔다.
export function cardGridClass(count: number): string {
  if (count === 1) return "mx-auto grid max-w-[25rem] grid-cols-1 gap-4";
  if (count === 2) return "mx-auto grid grid-cols-1 gap-4 sm:max-w-[51rem] sm:grid-cols-2";
  return "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";
}
