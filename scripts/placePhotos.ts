import type { Place } from "@/types/travel";

// 장소 사진을 네이버 이미지 검색에서 채운다. build:places와 build:photos가 함께 쓴다.
//
// 전에는 TourAPI의 firstimage를 썼는데, 네이버 지역 검색으로만 들어온 가게(카페 45곳·
// 음식점 31곳)를 TourAPI가 아예 모른다. 그 자리가 전부 비어 있었다.
//
// 저장하는 주소는 원본이 아니라 네이버가 만들어 둔 340px 썸네일이다. 원본은 1080px에
// 0.5~1.3MB가 흔한데 카드 커버는 340px 자리라, 그대로 걸면 목록 한 장에 수 MB가 된다.

/** 한 번에 보낼 요청 수. 네이버 검색 API는 몰아 부르면 429를 돌려준다. */
const BATCH_SIZE = 3;

export interface PhotoFillResult {
  filled: number;
  kept: number;
  empty: number;
}

/**
 * places의 photos를 네이버 이미지 검색 결과로 바꾼다(제자리 수정).
 * 이름이 적힌 사진을 못 찾으면 원래 사진을 그대로 둔다 — 멀쩡한 사진을 지우고
 * 빈칸을 만들 이유는 없다.
 */
export async function fillNaverPhotos(
  places: Place[],
  options: { log?: boolean } = {},
): Promise<PhotoFillResult> {
  const { searchPlaceImage } = await import("@/lib/api/naverImageSearch");
  const result: PhotoFillResult = { filled: 0, kept: 0, empty: 0 };

  for (let i = 0; i < places.length; i += BATCH_SIZE) {
    const batch = places.slice(i, i + BATCH_SIZE);
    const images = await Promise.all(batch.map((place) => searchPlaceImage(place.name)));
    batch.forEach((place, index) => {
      const image = images[index];
      if (image) {
        place.photos = [image.medium];
        result.filled += 1;
        if (options.log) console.log(`  ✓ ${place.name} — ${image.title.slice(0, 40)}`);
        return;
      }
      if (place.photos.length > 0) {
        result.kept += 1;
        if (options.log) console.log(`  · ${place.name} — 검색 결과 없음, 기존 사진 유지`);
        return;
      }
      result.empty += 1;
      if (options.log) console.log(`  - ${place.name} — 사진 없음`);
    });
  }

  return result;
}
