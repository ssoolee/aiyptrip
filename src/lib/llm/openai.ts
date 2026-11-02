import { LlmProvider, LlmRequest } from "@/lib/llm/types";

// OpenAI Responses API — OPENAI_API_KEY를 쓰고 LLM_PROVIDER=openai로 고른다.
// 서버 전용: NEXT_PUBLIC_ 접두사를 붙이지 않는다.
// SDK 대신 fetch를 쓴다 — gemini.ts와 같은 방식이라 타임아웃·재시도·로그 규약이
// 한 가지로 유지되고, 호출이 네 군데(에이전트 둘, 빌드 스크립트 둘)뿐이라
// 의존성을 하나 더 들일 만큼 얻는 게 없다.
const RESPONSES_URL = "https://api.openai.com/v1/responses";

// 고빈도 짧은 작업("가장 효율적"이라고 소개된 등급)용 모델. 코스 제목·한 줄 요약·
// 태그 추출이 전부라 이걸로 충분하다. 품질을 올리려면 OPENAI_MODEL=gpt-6.1-terra 등으로 지정.
const DEFAULT_MODEL = "gpt-6-luna";

// 추론 모델이라 effort를 올리면 추론 토큰만큼 느려지고 비싸진다. 여기 쓰임새는
// 짧은 생성이라 none이 맞다 (허용값: none|low|medium|high|xhigh|max).
const REASONING_EFFORT = "none";

// 시도 1회당 대기 상한. 사용자 요청 경로는 이 값을 쓰고, 오프라인 배치
// (scripts/build-places.ts)는 request의 timeoutMs로 더 길게 잡는다.
const ATTEMPT_TIMEOUT_MS = 8000;

// 일시적인 실패만 다시 보낸다 — 한도 초과(429)와 서버 측 오류.
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

interface ResponsesOutputPart {
  type?: string;
  text?: string;
}

interface ResponsesOutputItem {
  type?: string;
  content?: ResponsesOutputPart[];
}

export interface ResponsesPayload {
  status?: string;
  incomplete_details?: { reason?: string };
  output?: ResponsesOutputItem[];
}

/**
 * Responses API 응답에서 생성된 텍스트를 꺼낸다.
 * output[] 중 type="message"인 항목의 content[] 중 type="output_text"를 이어 붙인다.
 * 거절(refusal)이나 잘린 응답(status="incomplete")은 쓸 수 없으므로 null.
 */
export function extractText(data: ResponsesPayload): string | null {
  if (data.status === "incomplete") {
    console.warn(`[llm] openai 응답이 잘렸다 (${data.incomplete_details?.reason ?? "이유 미상"})`);
    return null;
  }

  const parts = (data.output ?? [])
    .filter((item) => item.type === "message")
    .flatMap((item) => item.content ?? []);
  // 안전 분류기가 거절하면 refusal 파트가 온다 — 텍스트가 섞여 있어도 쓰지 않는다.
  if (parts.some((part) => part.type === "refusal")) return null;

  const text = parts
    .filter((part) => part.type === "output_text")
    .map((part) => part.text ?? "")
    .join("")
    .trim();
  return text || null;
}

async function callOpenai(
  model: string,
  apiKey: string,
  { system, prompt, json, maxTokens = 2048, timeoutMs = ATTEMPT_TIMEOUT_MS }: LlmRequest,
): Promise<{ text: string | null; retryable: boolean }> {
  try {
    const res = await fetch(RESPONSES_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        input: [
          ...(system ? [{ role: "system", content: system }] : []),
          {
            role: "user",
            // json_object 모드는 입력에 JSON을 요구한다는 언급이 있어야 한다 (anthropic.ts와 같은 처리).
            content: json ? `${prompt}\n\nJSON 객체만 출력하세요. 설명이나 코드블록 없이.` : prompt,
          },
        ],
        max_output_tokens: maxTokens,
        reasoning: { effort: REASONING_EFFORT },
        ...(json && { text: { format: { type: "json_object" } } }),
      }),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    if (!res.ok) {
      // 호출부는 조용히 규칙 기반으로 넘어가므로, 원인은 서버 로그로만 남긴다.
      console.warn(`[llm] openai ${model} HTTP ${res.status}`);
      return { text: null, retryable: RETRYABLE_STATUS.has(res.status) };
    }
    return { text: extractText(await res.json()), retryable: false };
  } catch (error) {
    const name = error instanceof Error ? error.name : "error";
    console.warn(`[llm] openai ${model} ${name}`);
    return { text: null, retryable: name === "TimeoutError" };
  }
}

export const openaiProvider: LlmProvider = {
  name: "openai",
  async generateText(req: LlmRequest) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return null;
    const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;

    const first = await callOpenai(model, apiKey, req);
    if (first.text || !first.retryable) return first.text;
    // 일시적인 실패는 한 번만 더 보낸다 — 더 매달리면 응답 시간(PRD-00 KPI)을 먹는다.
    return (await callOpenai(model, apiKey, req)).text;
  },
};
