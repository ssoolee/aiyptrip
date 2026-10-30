// .xlsx에서 시트의 셀 값을 읽는 최소 구현. 외부 의존성을 더하지 않으려고 직접 푼다 —
// xlsx는 XML 몇 개를 담은 ZIP이고, 우리에게 필요한 건 문자열 표와 첫 시트의 행뿐이다.
//
// 기관이 내려 주는 현황 파일(엑셀로 만든 단순 표)만 상대한다. 수식·날짜 서식·여러 시트처럼
// 복잡한 문서는 다루지 않는다 — 그런 파일을 읽어야 하면 라이브러리를 들이는 편이 낫다.
import { readFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;

/** ZIP 안의 파일 하나를 꺼낸다. 없으면 null. */
function readZipEntry(buffer: Buffer, wanted: string): Buffer | null {
  // End of Central Directory는 파일 끝에 있고 가변 길이 주석이 뒤따를 수 있어 뒤에서 찾는다.
  let eocd = -1;
  for (let i = buffer.length - 22; i >= 0 && i > buffer.length - 22 - 0xffff; i -= 1) {
    if (buffer.readUInt32LE(i) === EOCD_SIGNATURE) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("ZIP 구조를 읽지 못했습니다 (EOCD 없음)");

  const entryCount = buffer.readUInt16LE(eocd + 10);
  let pointer = buffer.readUInt32LE(eocd + 16);

  for (let i = 0; i < entryCount; i += 1) {
    if (buffer.readUInt32LE(pointer) !== CENTRAL_SIGNATURE) break;
    const method = buffer.readUInt16LE(pointer + 10);
    const compressedSize = buffer.readUInt32LE(pointer + 20);
    const nameLength = buffer.readUInt16LE(pointer + 28);
    const extraLength = buffer.readUInt16LE(pointer + 30);
    const commentLength = buffer.readUInt16LE(pointer + 32);
    const localOffset = buffer.readUInt32LE(pointer + 42);
    const name = buffer.toString("utf8", pointer + 46, pointer + 46 + nameLength);

    if (name === wanted) {
      // 지역 헤더의 이름·확장 필드 길이는 중앙 디렉터리와 다를 수 있어 여기서 다시 읽는다.
      const localNameLength = buffer.readUInt16LE(localOffset + 26);
      const localExtraLength = buffer.readUInt16LE(localOffset + 28);
      const start = localOffset + 30 + localNameLength + localExtraLength;
      const raw = buffer.subarray(start, start + compressedSize);
      return method === 0 ? Buffer.from(raw) : inflateRawSync(raw);
    }
    pointer += 46 + nameLength + extraLength + commentLength;
  }
  return null;
}

function unescapeXml(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, "&");
}

/** <t>조각</t>이 여러 개면 이어 붙인다 (서식이 섞인 셀). */
function textOf(xml: string): string {
  return [...xml.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => unescapeXml(m[1])).join("");
}

/** 셀 주소 "BC12" → 열 번호 54 (0부터). */
function columnIndex(ref: string): number {
  const letters = /^[A-Z]+/.exec(ref)?.[0] ?? "A";
  let index = 0;
  for (const ch of letters) index = index * 26 + (ch.charCodeAt(0) - 64);
  return index - 1;
}

/** 첫 시트를 문자열 2차원 배열로 읽는다. 빈 셀은 "". */
export function readSheetRows(filePath: string): string[][] {
  const buffer = readFileSync(filePath);

  const sharedXml = readZipEntry(buffer, "xl/sharedStrings.xml")?.toString("utf8") ?? "";
  const shared = [...sharedXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textOf(m[1]));

  const sheetXml = readZipEntry(buffer, "xl/worksheets/sheet1.xml")?.toString("utf8");
  if (!sheetXml) throw new Error("첫 시트(xl/worksheets/sheet1.xml)를 찾지 못했습니다");

  const rows: string[][] = [];
  for (const rowMatch of sheetXml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells: string[] = [];
    for (const cellMatch of rowMatch[1].matchAll(/<c([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cellMatch[1];
      const body = cellMatch[2] ?? "";
      const index = columnIndex(/r="([A-Z]+\d+)"/.exec(attrs)?.[1] ?? "A1");
      const type = /t="([^"]+)"/.exec(attrs)?.[1];
      const value = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];

      let text = "";
      if (type === "s" && value) text = shared[Number(value)] ?? "";
      else if (type === "inlineStr") text = textOf(body);
      else text = unescapeXml(value ?? "");

      while (cells.length < index) cells.push("");
      cells[index] = text.trim();
    }
    rows.push(cells);
  }
  return rows;
}
