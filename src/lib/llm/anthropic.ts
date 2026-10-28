import Anthropic from "@anthropic-ai/sdk";
import { LlmProvider, LlmRequest } from "@/lib/llm/types";

// Anthropic Claude API — ANTHROPIC_API_KEY 발급 후 LLM_PROVIDER=anthropic으로 전환.
const DEFAULT_MODEL = "claude-opus-5";
const TIMEOUT_MS = 8000;

let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  client ??= new Anthropic({ timeout: TIMEOUT_MS, maxRetries: 1 });
  return client;
}

export const anthropicProvider: LlmProvider = {
  name: "anthropic",
  async generateText({ system, prompt, json, maxTokens = 2048, timeoutMs }: LlmRequest) {
    const anthropic = getClient();
    if (!anthropic) return null;

    try {
      const response = await anthropic.beta.messages.create({
        model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
        max_tokens: maxTokens,
        // 코스 제목·요약 같은 짧은 생성 작업이라 effort를 낮춰 지연/비용을 줄인다.
        output_config: { effort: "low" },
        // 안전 분류기가 거절(stop_reason: "refusal")하면 서버가 대체 모델로 재시도한다.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        ...(system && { system }),
        messages: [
          {
            role: "user",
            content: json ? `${prompt}\n\nJSON 객체만 출력하세요. 설명이나 코드블록 없이.` : prompt,
          },
        ],
      }, timeoutMs ? { timeout: timeoutMs } : undefined);
      if (response.stop_reason === "refusal") return null;
      const text = response.content
        .map((block) => (block.type === "text" ? block.text : ""))
        .join("")
        .trim();
      return text || null;
    } catch {
      return null;
    }
  },
};
