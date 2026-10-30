// 기관이 공개하는 반려동물 동반 업소 현황 엑셀에서 양평군만 뽑아
// data/pet-friendly.source.json에 합친다.
//   실행: npm run import:pet -- "반려동물_동반출입_음식점_현황(....).xlsx"
//   이어서: npm run build:pet  (합친 목록으로 src/lib/data/petPlaces.json 재생성)
//
// 목록은 기관·사업마다 따로 공개된다("반려동물 동반 가능 업소 현황", "반려동물 동반출입
// 음식점 현황" 등). 그래서 새 파일로 기존 목록을 갈아끼우지 않고 **합친다** — 한 목록에만
// 올라와 있는 업소를 새 파일에 없다는 이유로 지우면 쓸 수 있는 곳이 줄어든다.
// 같은 업소인지는 도로명 주소(건물번호까지)로 가린다. 상호 표기는 목록마다 다르다.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { readSheetRows } from "./xlsx";

const SOURCE = path.join(process.cwd(), "data/pet-friendly.source.json");

interface SourceEntry {
  name: string;
  businessTypes: string[];
  address: string;
}

interface SourceFile {
  source: { title: string; note: string; imported?: string[] };
  places: SourceEntry[];
}

// "경기도 양평군 서종면 황순원로 455-1(1-2층)" → "황순원로455-1"
function roadKey(address: string): string | null {
  const match = address.replace(/\(.*$/, "").match(/([가-힣\d]+(?:로|길)(?:\d+번?길)?)\s*(\d+(?:-\d+)?)/);
  return match ? `${match[1]}${match[2]}` : null;
}

/** 머리글 행에서 열 위치를 찾는다 — 목록마다 열 순서가 다르다. */
function findColumns(rows: string[][]): { header: number; name: number; type: number; address: number } {
  for (const [index, row] of rows.slice(0, 10).entries()) {
    const name = row.findIndex((cell) => /업소\s*명|업체\s*명|상호/.test(cell));
    const type = row.findIndex((cell) => /업종|업태/.test(cell));
    const address = row.findIndex((cell) => /주소|소재지/.test(cell));
    if (name >= 0 && address >= 0) return { header: index, name, type, address };
  }
  throw new Error("머리글 행(업소명·주소)을 찾지 못했습니다");
}

function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('사용법: npm run import:pet -- "<엑셀 파일 경로>"');
    process.exit(1);
  }

  const rows = readSheetRows(file);
  const columns = findColumns(rows);
  const body = rows.slice(columns.header + 1);

  // 서울 영등포구 "양평동"이 주소에 섞여 들어온다 — 군 단위까지 보고 거른다.
  const yangpyeong = body.filter((row) => /양평군/.test(row[columns.address] ?? ""));
  console.log(`전체 ${body.length}행 중 양평군 ${yangpyeong.length}곳`);

  const source = JSON.parse(readFileSync(SOURCE, "utf8")) as SourceFile;
  const byRoad = new Map<string, SourceEntry>();
  for (const place of source.places) {
    const key = roadKey(place.address);
    if (key) byRoad.set(key, place);
  }

  const added: SourceEntry[] = [];
  const merged: string[] = [];
  for (const row of yangpyeong) {
    const name = row[columns.name]?.trim();
    const address = row[columns.address]?.trim();
    if (!name || !address) continue;
    const businessType = (columns.type >= 0 ? row[columns.type] : "")?.trim() || "일반음식점";

    const key = roadKey(address);
    const existing = key ? byRoad.get(key) : undefined;
    if (existing) {
      // 같은 업소다. 새 목록에만 있는 업종을 더해 둔다 (제과점영업 등은 카페 판정에 쓰인다).
      if (!existing.businessTypes.includes(businessType)) {
        existing.businessTypes.push(businessType);
        console.log(`  ~ ${existing.name} — 업종에 "${businessType}" 추가`);
      }
      merged.push(`${name} = ${existing.name}`);
      continue;
    }
    const entry: SourceEntry = { name, businessTypes: [businessType], address };
    source.places.push(entry);
    if (key) byRoad.set(key, entry);
    added.push(entry);
    console.log(`  + ${name} — ${address}`);
  }

  source.places.sort((a, b) => a.name.localeCompare(b.name, "ko"));
  const label = `${path.basename(file)} (양평군 ${yangpyeong.length}곳)`;
  source.source.imported = [...new Set([...(source.source.imported ?? []), label])];
  writeFileSync(SOURCE, `${JSON.stringify(source, null, 1)}\n`, "utf8");

  console.log(
    `\n새로 추가 ${added.length}곳, 이미 있던 곳 ${merged.length}곳 → 목록 ${source.places.length}곳`,
  );
  console.log(`저장: ${path.relative(process.cwd(), SOURCE)}`);
  if (added.length > 0) console.log("\n이어서 npm run build:pet 을 실행하세요.");
}

main();
