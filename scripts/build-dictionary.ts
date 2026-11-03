// 화면 문구 사전을 한국어에서 다른 언어로 옮긴다.
// 실행: npm run build:dict -- --locale ja   (분량만 보려면 --dry)
//
// **이미 있는 값은 건드리지 않는다.** 빠진 키만 채운다 — 사람이 고친 문구를 다시
// 돌렸다고 덮어쓰면 검수가 헛일이 되기 때문이다. 문구를 새로 다듬고 싶으면 그 키를
// 지우고 다시 돌린다.
//
// 자료 번역(scripts/build-i18n.ts)과 나누어 둔 이유: 이쪽은 사람이 쓴 UI 문구라
// 손으로 고칠 일이 잦고, 저쪽은 장소 219곳짜리 기계 번역이라 통째로 다시 만들 일이 잦다.
import { loadEnvConfig } from "@next/env";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

loadEnvConfig(process.cwd());

const DICT_DIR = path.join(process.cwd(), "src/lib/i18n/dictionaries");
const SOURCE = path.join(DICT_DIR, "ko.json");

// 번역하지 않고 한국어(원본)에서 그대로 가져오는 자리.
//   lang.*     — 언어 이름은 **그 언어로** 적는다("한국어", "English", "日本語").
//                어느 사전에서나 같아야 목록이 읽힌다.
//   search.*   — 검색창 예시는 진짜 한국어 검색어다. 자연어 검색은 한국어에서만
//                열리므로(SEARCH_LOCALES) 다른 언어에서는 화면에 뜨지도 않는다.
const COPY_VERBATIM = (keyPath: string) =>
  (keyPath.startsWith("lang.") && keyPath !== "lang.label") || keyPath.startsWith("search.examples");

const BATCH = 25;
const PAUSE_MS = 1500;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

/** 사전을 "a.b.c" → 값으로 편다. 배열은 "a.b.0"처럼 번호를 붙인다. */
function flatten(node: Json, prefix = "", out: Record<string, Json> = {}): Record<string, Json> {
  if (Array.isArray(node)) {
    node.forEach((item, index) => flatten(item, `${prefix}${index}.`, out));
  } else if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) flatten(value, `${prefix}${key}.`, out);
  } else {
    out[prefix.slice(0, -1)] = node;
  }
  return out;
}

/** 한국어 쪽 구조를 따라 걸으며 번역을 끼워 넣는다 — 키 순서가 원본과 같아진다. */
function rebuild(source: Json, translations: Record<string, string>, prefix = ""): Json {
  if (Array.isArray(source)) {
    return source.map((item, index) => rebuild(item, translations, `${prefix}${index}.`));
  }
  if (source && typeof source === "object") {
    return Object.fromEntries(
      Object.entries(source).map(([key, value]) => [key, rebuild(value, translations, `${prefix}${key}.`)]),
    );
  }
  const keyPath = prefix.slice(0, -1);
  if (typeof source !== "string") return source;
  return translations[keyPath] ?? source;
}

const SYSTEM = `You translate the interface text of a Korean travel web app into {LANGUAGE}.
The app plans day trips around Yangpyeong County, South Korea, for visitors.

Rules:
- This is interface copy: buttons, headings, hints, empty states, error messages and aria-labels.
  Keep each one about as short as the Korean. A button label must stay a button label.
- Placeholders like {count}, {name}, {days} are substituted at runtime. Keep every one of them
  exactly as written, and put them where the sentence needs them in {LANGUAGE}.
- Keep leading or trailing spaces, arrows (→), bullets (·) and emoji exactly as they appear.
- "평이" / "Pyeong-i" is the app's water-drop mascot. Keep that name recognisable.
- Korean place and dish names stay as proper nouns; do not invent translations for them.
- Keep the warm, plain, friendly tone. No exclamation marks that the Korean does not have.
- Reply with JSON only: {"<id>": "<translation>"} with an entry for every id given.`;

async function main() {
  const args = process.argv.slice(2);
  const locale = args[args.indexOf("--locale") + 1];
  const dry = args.includes("--dry");
  if (!locale || locale === "ko" || locale.startsWith("--")) {
    console.error("--locale <ja|zh|...> 가 필요하다");
    process.exit(1);
  }

  const { LANGUAGE_NAME } = await import("@/lib/i18n/config");
  // 아직 config에 없는 언어도 만들 수 있어야 한다 — 사전이 없으면 LOCALES에 넣는 순간
  // getDictionary가 깨지므로, 순서가 사전 먼저다.
  const language =
    (LANGUAGE_NAME as Record<string, string>)[locale] ??
    ({ ja: "Japanese", zh: "Simplified Chinese" } as Record<string, string>)[locale];
  if (!language) {
    console.error(`${locale}의 언어 이름을 모른다 — config.ts의 LANGUAGE_NAME에 먼저 적는다`);
    process.exit(1);
  }

  const outPath = path.join(DICT_DIR, `${locale}.json`);
  const source = JSON.parse(readFileSync(SOURCE, "utf8")) as Json;
  const existing: Record<string, string> = existsSync(outPath)
    ? (flatten(JSON.parse(readFileSync(outPath, "utf8")) as Json) as Record<string, string>)
    : {};

  const flat = flatten(source);
  const translations: Record<string, string> = {};
  const todo: { key: string; ko: string }[] = [];

  for (const [key, value] of Object.entries(flat)) {
    if (typeof value !== "string") continue;
    if (COPY_VERBATIM(key)) {
      translations[key] = value;
      continue;
    }
    const old = existing[key];
    if (typeof old === "string" && old.trim() && old !== value) {
      translations[key] = old;
      continue;
    }
    todo.push({ key, ko: value });
  }

  const chars = todo.reduce((sum, item) => sum + item.ko.length, 0);
  console.log(`[${locale}] 문구 ${Object.keys(flat).length}개`);
  console.log(`  번역할 것: ${todo.length}개 (${chars.toLocaleString()}자)`);
  console.log(`  그대로 두는 것: ${Object.keys(translations).length}개`);
  if (dry || todo.length === 0) {
    if (todo.length === 0) console.log("  빠진 키가 없다 — 파일을 그대로 둔다.");
    return;
  }

  const { generateJson } = await import("@/lib/llm");
  let failed = 0;

  for (let i = 0; i < todo.length; i += BATCH) {
    const batch = todo.slice(i, i + BATCH);
    const prompt = `Translate each "korean" into ${language}.
"id" is where the text sits in the app, which tells you what kind of text it is
(for example "course.loadMore" is a button, "notFound.body" is a sentence on an error screen).
Reply as {"<id>": "<translation>"}.

${JSON.stringify(
  batch.map((item) => ({ id: item.key, korean: item.ko })),
  null,
  1,
)}`;

    const result = await generateJson<Record<string, string>>({
      system: SYSTEM.replace(/\{LANGUAGE\}/g, language),
      prompt,
      timeoutMs: 120_000,
      maxTokens: 8000,
    });

    for (const item of batch) {
      const translated = result?.[item.key];
      // 번역을 못 받으면 한국어가 남는다 — 빈 화면보다 낫고, 다시 돌리면 그 키만 채운다.
      if (typeof translated === "string" && translated.trim()) translations[item.key] = translated.trim();
      else failed++;
    }
    console.log(`  ${Math.min(i + BATCH, todo.length)}/${todo.length}`);
    await sleep(PAUSE_MS);
  }

  writeFileSync(outPath, `${JSON.stringify(rebuild(source, translations), null, 2)}\n`, "utf8");
  console.log(
    `\n[${locale}] ${path.relative(process.cwd(), outPath)} 저장` +
      (failed > 0 ? ` (${failed}개는 번역을 못 받아 한국어로 남았다)` : ""),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
