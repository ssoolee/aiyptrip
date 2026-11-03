// 사전 문구에 값을 끼워 넣는다. fill("{count}곳이에요", { count: 18 }) → "18곳이에요"
//
// 한국어는 "18곳", 영어는 "18 places"처럼 수와 단위의 자리와 띄어쓰기가 달라서,
// 코드에서 문자열을 이어 붙이면 한쪽이 반드시 어색해진다. 자리를 문구 안에 두고
// 값만 넣는다.
//
// 없는 이름은 빈 문자열이 된다 — 화면에 "{count}"가 그대로 나가는 것보다 낫다.
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in values ? String(values[key]) : "",
  );
}
