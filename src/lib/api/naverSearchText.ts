// 네이버 검색 API(지역·블로그) 응답의 공통 처리. 검색어와 일치하는 부분이
// <b> 태그로 감싸여 오고 특수문자가 HTML 엔티티로 오므로 둘 다 벗겨 낸다.
export function stripHtml(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}
