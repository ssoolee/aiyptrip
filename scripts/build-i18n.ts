// 커밋된 장소·코스 자료를 언어별로 번역해 사이드카 파일로 둔다.
// 실행: npm run build:i18n -- --locale en   (분량만 보려면 --dry)
//
// 요청마다 번역하지 않고 오프라인에서 한 번 만들어 커밋한다 — 이 저장소가
// build:places·build:mbti에서 쓰는 방식 그대로다. 이유는 셋이다:
//   ① 화면이 번역을 기다리지 않는다 (사전 생성 코스의 노출 지연 ≤ 0.5초를 지킨다)
//   ② 같은 장소가 늘 같은 영문 이름으로 나온다
//   ③ 번역을 사람이 고칠 수 있다 — JSON이라 diff가 읽히고, 고친 값은 다시 번역되지 않는다
//
// **한국어 원본(src/lib/data/*.json)은 건드리지 않는다.** build:places 같은 스크립트가
// 그 파일들을 다시 쓰므로, 번역을 안에 넣으면 덮여 사라진다.
//
// 번역하지 않는 것:
//   · businessHoursRaw — src/lib/businessHours.ts가 한국어 정규식으로 **해석**하는 입력이다.
//     번역하면 파서가 죽는다. 화면에 보이는 해석 결과는 사전(hours.*)에서 나온다.
//   · 코스의 hours notice — 저장된 값이 아니라 withHoursNotice가 사전 틀로 그때 만든다.
//   · topPlaces의 basis·recentBasis, petPlaces의 source — 화면에 쓰이지 않는다 (렌더 경로 확인).
//
// 번역 품질을 올리려면 더 좋은 모델을 지정한다: OPENAI_MODEL=gpt-6.1-terra npm run build:i18n
import { loadEnvConfig } from "@next/env";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

loadEnvConfig(process.cwd());

const DATA_DIR = path.join(process.cwd(), "src/lib/data");
const OUT_DIR = path.join(DATA_DIR, "i18n");
const SOURCE_FILES = ["places", "mbtiCourses", "soloCourses", "topPlaces", "petPlaces"] as const;

// 장소에 딸린 글. placeId로 묶어 **한 번만** 번역한다 — 같은 장소가 스냅샷과 코스
// 사본에 중복으로 들어 있어, 묶지 않으면 8,729자를 더 번역하게 된다 (실측).
const PLACE_FIELDS = ["name", "address", "categoryLabel", "reviewSummary", "reviewTitle"] as const;

// 장소에 딸리지 않은 자유 문장. **한국어 원문을 키로 쓴다.** 이유 셋:
//   ① 원문이 바뀌면 키가 바뀌므로 낡은 번역이 조용히 남지 않는다
//   ② 같은 문장이 여러 번 나오면 한 번만 번역된다
//   ③ 사람이 검수할 파일이다 — 해시 키로는 무엇의 번역인지 읽을 수 없다.
//      런타임에 해시를 다시 계산할 필요도 없어진다(브라우저에 node:crypto가 없다).
const TEXT_FIELDS = ["title", "summary", "reason", "lodgingType", "notice", "place"] as const;

const KOREAN = /[가-힣]/;

// 한 번에 보내는 항목 수. 너무 크면 모델이 뒤쪽을 건너뛰거나 응답이 잘린다.
const PLACE_BATCH = 10;
const TEXT_BATCH = 12;
// 배치 사이 간격. 오프라인 배치라 느려도 상관없고, 분당 한도에 걸리는 쪽이 더 비싸다.
const PAUSE_MS = 1500;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const hash = (text: string) => createHash("sha1").update(text).digest("hex").slice(0, 12);

type PlaceField = (typeof PLACE_FIELDS)[number];
type TextField = (typeof TEXT_FIELDS)[number];

interface PlaceSource {
  placeId: string;
  fields: Partial<Record<PlaceField, string>>;
}

interface TextSource {
  kind: TextField;
  /** 한국어 원문. 이것이 곧 사이드카의 키다. */
  ko: string;
  /** 번역에 쓸 곁정보 — 추천 이유라면 그 장소 이름. 저장하지 않는다. */
  context?: string;
}

interface PlaceEntry extends Partial<Record<PlaceField, string>> {
  /** 한국어 원문의 해시. 원문이 바뀐 장소만 다시 번역한다. */
  hash: string;
}

interface Sidecar {
  /** 사람이 고친 값을 지우지 않도록, 형식을 바꿀 때 올린다. */
  version: number;
  generatedAt: string;
  places: Record<string, PlaceEntry>;
  /** 한국어 원문 → 번역. 원문이 키라 따로 hash 필드가 없다. */
  texts: Record<string, string>;
}

/** 자료 파일을 훑어 번역할 글을 모은다. 파일 구조에 기대지 않고 키 이름으로 찾는다. */
function collect() {
  const places = new Map<string, PlaceSource>();
  const texts = new Map<string, TextSource>();

  const walk = (node: unknown, nearbyName?: string) => {
    if (Array.isArray(node)) {
      node.forEach((item) => walk(item, nearbyName));
      return;
    }
    if (!node || typeof node !== "object") return;
    const obj = node as Record<string, unknown>;

    // 이 객체가 장소라면 placeId로 묶는다. 먼저 본 값을 남긴다 —
    // places.json을 가장 먼저 읽으므로 스냅샷 쪽이 기준이 된다.
    const placeId = typeof obj.placeId === "string" ? obj.placeId : undefined;
    if (placeId) {
      const entry = places.get(placeId) ?? { placeId, fields: {} };
      for (const field of PLACE_FIELDS) {
        const value = obj[field];
        if (typeof value === "string" && KOREAN.test(value) && !entry.fields[field]) {
          entry.fields[field] = value;
        }
      }
      places.set(placeId, entry);
    }

    // 장소 이름은 추천 이유를 번역할 때의 곁정보로 쓴다.
    const name = typeof obj.name === "string" ? obj.name : nearbyName;

    for (const field of TEXT_FIELDS) {
      const value = obj[field];
      if (typeof value !== "string" || !KOREAN.test(value)) continue;
      if (!texts.has(value)) texts.set(value, { kind: field, ko: value, context: name });
    }

    for (const [key, value] of Object.entries(obj)) {
      // 장소 필드는 위에서 처리했다. name은 장소가 아닌 객체에도 있을 수 있어 건너뛰지 않는다.
      if (placeId && (PLACE_FIELDS as readonly string[]).includes(key)) continue;
      if ((TEXT_FIELDS as readonly string[]).includes(key) && typeof value === "string") continue;
      walk(value, name);
    }
  };

  for (const file of SOURCE_FILES) {
    walk(JSON.parse(readFileSync(path.join(DATA_DIR, `${file}.json`), "utf8")));
  }

  // 장소 이름이 없는 장소는 번역할 것이 없다.
  for (const [id, entry] of places) {
    if (Object.keys(entry.fields).length === 0) places.delete(id);
  }
  return { places: [...places.values()], texts: [...texts.values()] };
}

function placeHash(source: PlaceSource): string {
  return hash(PLACE_FIELDS.map((f) => source.fields[f] ?? "").join("\u0000"));
}

const SYSTEM = `You translate a Korean travel guide for Yangpyeong County, South Korea into {LANGUAGE}.
Readers are foreign visitors who will use this to actually get around, so accuracy beats fluency.

Rules:
- Place names: use the English name the business itself uses when you know it; otherwise use
  Revised Romanization of Korean. Return the name alone, with no Korean in it — the app shows
  the Korean next to it by itself.
- Addresses: Revised Romanization in Western order, smallest unit first.
  "경기도 양평군 옥천면 고읍로 140" becomes "140 Goeup-ro, Okcheon-myeon, Yangpyeong-gun, Gyeonggi-do".
- Category labels keep their separator: "한식>냉면" becomes "Korean > Naengmyeon".
- Korean dishes and local terms stay romanized (Naengmyeon, Makguksu, Hanu) rather than being
  replaced by an invented equivalent. Add a two- or three-word gloss only where a reader could
  not guess at all.
- Keep the warm, plain tone of the original and roughly its length. Do not add facts, prices,
  opening hours or superlatives that are not in the Korean. Do not drop any caveat.
- Reply with JSON only, in the exact shape asked for, with an entry for every id given.`;

interface TranslateOptions {
  language: string;
  dry: boolean;
}

async function translateBatch<T>(
  prompt: string,
  options: TranslateOptions,
): Promise<Record<string, T> | null> {
  const { generateJson } = await import("@/lib/llm");
  return generateJson<Record<string, T>>({
    system: SYSTEM.replace("{LANGUAGE}", options.language),
    prompt,
    // 오프라인 배치라 길게 잡는다 — 한 배치에 열 항목이 들어간다.
    timeoutMs: 120_000,
    maxTokens: 8000,
  });
}

async function main() {
  const args = process.argv.slice(2);
  const locale = args[args.indexOf("--locale") + 1] ?? "en";
  const dry = args.includes("--dry");
  const { LOCALES, DEFAULT_LOCALE, LANGUAGE_NAME } = await import("@/lib/i18n/config");

  if (!(LOCALES as readonly string[]).includes(locale) || locale === DEFAULT_LOCALE) {
    console.error(`--locale은 ${LOCALES.filter((l) => l !== DEFAULT_LOCALE).join("|")} 중 하나여야 한다`);
    process.exit(1);
  }
  const language = LANGUAGE_NAME[locale as keyof typeof LANGUAGE_NAME];
  const outPath = path.join(OUT_DIR, `content.${locale}.json`);

  const { places, texts } = collect();
  const previous: Sidecar | null = existsSync(outPath)
    ? (JSON.parse(readFileSync(outPath, "utf8")) as Sidecar)
    : null;

  // 이미 번역돼 있고 원문이 그대로인 것은 건너뛴다. 사람이 고친 값도 이 규칙으로 살아남는다.
  const keptPlaces: Record<string, PlaceEntry> = {};
  const stalePlaces: PlaceSource[] = [];
  for (const source of places) {
    const current = placeHash(source);
    const old = previous?.places?.[source.placeId];
    if (old && old.hash === current) keptPlaces[source.placeId] = old;
    else stalePlaces.push(source);
  }

  const keptTexts: Record<string, string> = {};
  const staleTexts: TextSource[] = [];
  for (const source of texts) {
    const old = previous?.texts?.[source.ko];
    if (old) keptTexts[source.ko] = old;
    else staleTexts.push(source);
  }

  const chars =
    stalePlaces.reduce((sum, p) => sum + Object.values(p.fields).join("").length, 0) +
    staleTexts.reduce((sum, t) => sum + t.ko.length, 0);

  console.log(`[${locale}] 장소 ${places.length}곳 · 문장 ${texts.length}개`);
  console.log(
    `  번역할 것: 장소 ${stalePlaces.length}곳 · 문장 ${staleTexts.length}개 (${chars.toLocaleString()}자)`,
  );
  console.log(`  그대로 두는 것: 장소 ${Object.keys(keptPlaces).length}곳 · 문장 ${Object.keys(keptTexts).length}개`);

  if (dry) {
    // 돈을 쓰기 전에 무엇이 모델로 가는지 눈으로 본다. 특히 businessHoursRaw처럼
    // 번역하면 안 되는 필드가 섞여 들어오지 않았는지.
    console.log("\n  [장소 표본]");
    for (const p of stalePlaces.slice(0, 2)) console.log("   ", JSON.stringify(p.fields));
    console.log("  [문장 표본]");
    for (const kind of TEXT_FIELDS) {
      const sample = staleTexts.find((t) => t.kind === kind);
      if (sample) console.log(`    ${kind.padEnd(12)} ${sample.ko.slice(0, 60)}`);
    }
    const kinds = TEXT_FIELDS.map((k) => `${k} ${staleTexts.filter((t) => t.kind === k).length}`);
    console.log(`  [문장 종류] ${kinds.join(" · ")}`);
    return;
  }
  if (chars === 0) {
    console.log("  번역할 것이 없다 — 파일을 그대로 둔다.");
    return;
  }

  const outPlaces = { ...keptPlaces };
  const outTexts = { ...keptTexts };
  let failed = 0;

  for (let i = 0; i < stalePlaces.length; i += PLACE_BATCH) {
    const batch = stalePlaces.slice(i, i + PLACE_BATCH);
    const payload = batch.map((p) => ({ id: p.placeId, ...p.fields }));
    const prompt = `Translate each field of each place into ${language}.
Reply as {"<id>": {"<field>": "<translation>"}} using only the fields given for that id.

${JSON.stringify(payload, null, 1)}`;

    const result = await translateBatch<Partial<Record<PlaceField, string>>>(prompt, { language, dry });
    for (const source of batch) {
      const translated = result?.[source.placeId];
      if (!translated?.name) {
        // 번역이 없으면 그 장소는 한국어로 떨어진다 — 빈 화면보다 낫다.
        failed++;
        continue;
      }
      const entry: PlaceEntry = { hash: placeHash(source) };
      for (const field of PLACE_FIELDS) {
        const value = translated[field];
        if (source.fields[field] && typeof value === "string" && value.trim()) {
          entry[field] = value.trim();
        }
      }
      outPlaces[source.placeId] = entry;
    }
    console.log(`  장소 ${Math.min(i + PLACE_BATCH, stalePlaces.length)}/${stalePlaces.length}`);
    await sleep(PAUSE_MS);
  }

  // 숙소 이름 등은 장소 이름과 같은 문장이 자유 문장으로도 들어온다.
  // 같은 장소가 화면 두 곳에서 다른 이름으로 보이지 않도록, 장소 번역을 먼저 찾아 쓴다.
  const nameByKorean = new Map<string, string>();
  for (const source of places) {
    const name = source.fields.name;
    const translated = outPlaces[source.placeId]?.name;
    if (name && translated) nameByKorean.set(name, translated);
  }

  const remaining = staleTexts.filter((t) => {
    const reused = nameByKorean.get(t.ko);
    if (!reused) return true;
    outTexts[t.ko] = reused;
    return false;
  });

  for (let i = 0; i < remaining.length; i += TEXT_BATCH) {
    const batch = remaining.slice(i, i + TEXT_BATCH);
    const payload = batch.map((t, index) => ({
      id: `t${index}`,
      kind: t.kind,
      about: t.kind === "title" || t.kind === "summary" ? undefined : t.context,
      korean: t.ko,
    }));
    const prompt = `Translate each "korean" into ${language}.
"kind" says what the sentence is: title (a course name), summary (an MBTI personality blurb),
reason (why this stop suits the trip), lodgingType (a room or lodging category),
notice (a caveat the traveller must not miss), place (a place name).
"about" is the place it refers to, for context only — do not translate it into the answer.
Reply as {"<id>": "<translation>"}.

${JSON.stringify(payload, null, 1)}`;

    const result = await translateBatch<string>(prompt, { language, dry });
    batch.forEach((source, index) => {
      const translated = result?.[`t${index}`];
      if (typeof translated === "string" && translated.trim()) outTexts[source.ko] = translated.trim();
      else failed++;
    });
    console.log(`  문장 ${Math.min(i + TEXT_BATCH, remaining.length)}/${remaining.length}`);
    await sleep(PAUSE_MS);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const sidecar: Sidecar = {
    version: 2,
    generatedAt: new Date().toISOString(),
    // 키를 정렬해 둔다 — 다시 돌렸을 때 diff가 바뀐 줄만 보여 준다.
    places: Object.fromEntries(Object.entries(outPlaces).sort(([a], [b]) => a.localeCompare(b))),
    texts: Object.fromEntries(Object.entries(outTexts).sort(([a], [b]) => a.localeCompare(b))),
  };
  writeFileSync(outPath, `${JSON.stringify(sidecar, null, 1)}\n`, "utf8");

  console.log(
    `\n[${locale}] 장소 ${Object.keys(sidecar.places).length}곳 · 문장 ${Object.keys(sidecar.texts).length}개 저장` +
      (failed > 0 ? ` (${failed}개는 번역을 못 받아 한국어로 남는다)` : ""),
  );
  console.log(`  ${path.relative(process.cwd(), outPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
