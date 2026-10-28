import { LlmProvider, LlmRequest } from "@/lib/llm/types";

// Google Gemini API (AI Studio 무료 등급) — REST generateContent 호출.
// 서버 전용: GEMINI_API_KEY에 NEXT_PUBLIC_ 접두사를 붙이지 않는다.
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// "-latest" 별칭은 최신 모델을 가리켜 구 모델 지원 종료 시에도 계속 동작한다
// (예: gemini-2.5-flash는 이미 신규 사용자에게 404). Flash-Lite는 무료 등급에서
// 과부하(503)가 적고 1~2초대로 빨라 제목/요약 같은 짧은 생성에 충분하다.
// 더 높은 품질이 필요하면 GEMINI_MODEL=gemini-flash-latest 등으로 지정한다.
const DEFAULT_MODEL = "gemini-flash-lite-latest";

// 무료 등급은 평소 1~2초에 응답하지만, 같은 요청도 가끔 30초 이상 멈춘다
// (실측). 오래 기다리기보다 짧게 끊고 한 번 더 보내는 편이 성공률이 높다 —
// 시도당 4초 × 최대 2회로 호출 1건이 8초를 넘지 않게 해 15초 KPI를 지킨다.
const ATTEMPT_TIMEOUT_MS = 4000;

// 과부하(503)·타임아웃은 재시도 대상. 지정 모델이 이런 이유로 실패하면
// 두 번째 시도는 과부하가 적은 기본 모델로 보낸다.
const RETRYABLE_STATUS = new Set([500, 503]);

// 무료 등급 한도는 모델별 분당 요청 수(실측: flash-lite 15 RPM)다. 429를 받으면
// 같은 분 안의 재시도는 모두 실패하므로, 잠시 호출을 멈추고 바로 fallback한다.
const RATE_LIMIT_PAUSE_MS = 30_000;
const pausedUntil = new Map<string, number>();

async function callGemini(
  model: string,
  apiKey: string,
  { system, prompt, json, maxTokens = 2048, timeoutMs = ATTEMPT_TIMEOUT_MS }: LlmRequest,
): Promise<{ text: string | null; retryable: boolean }> {
  if ((pausedUntil.get(model) ?? 0) > Date.now()) return { text: null, retryable: false };
  try {
    const res = await fetch(`${GEMINI_API_BASE}/${model}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        ...(system && { systemInstruction: { parts: [{ text: system }] } }),
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: maxTokens,
          ...(json && { responseMimeType: "application/json" }),
        },
      }),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    if (!res.ok) {
      // 호출부는 조용히 fallback하므로, 원인(한도 초과·과부하 등)은 서버 로그로만 남긴다.
      console.warn(`[llm] gemini ${model} HTTP ${res.status}`);
      if (res.status === 429) pausedUntil.set(model, Date.now() + RATE_LIMIT_PAUSE_MS);
      return { text: null, retryable: RETRYABLE_STATUS.has(res.status) };
    }
    const data = await res.json();
    const parts: { text?: string; thought?: boolean }[] = data?.candidates?.[0]?.content?.parts ?? [];
    const text = parts
      .filter((p) => !p.thought)
      .map((p) => p.text ?? "")
      .join("")
      .trim();
    return { text: text || null, retryable: false };
  } catch (error) {
    const name = error instanceof Error ? error.name : "error";
    console.warn(`[llm] gemini ${model} ${name}`);
    return { text: null, retryable: name === "TimeoutError" };
  }
}

export const geminiProvider: LlmProvider = {
  name: "gemini",
  async generateText(req: LlmRequest) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

    const first = await callGemini(model, apiKey, req);
    if (first.text || !first.retryable) return first.text;
    return (await callGemini(DEFAULT_MODEL, apiKey, req)).text;
  },
};
