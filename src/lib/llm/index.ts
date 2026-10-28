import { anthropicProvider } from "@/lib/llm/anthropic";
import { geminiProvider } from "@/lib/llm/gemini";
import { LlmProvider, LlmProviderName, LlmRequest } from "@/lib/llm/types";

// 공급자 전환은 .env.local의 LLM_PROVIDER 값만 바꾸면 된다 (기본: gemini).
const PROVIDERS: Record<LlmProviderName, LlmProvider> = {
  gemini: geminiProvider,
  anthropic: anthropicProvider,
};

export function getLlmProvider(): LlmProvider {
  const name = process.env.LLM_PROVIDER as LlmProviderName | undefined;
  return (name && PROVIDERS[name]) || geminiProvider;
}

export function generateText(req: LlmRequest): Promise<string | null> {
  return getLlmProvider().generateText(req);
}

// JSON 응답을 파싱해 돌려준다. 모델이 ```json 코드블록으로 감싸는 경우도 처리.
// 파싱 실패 시 null — 호출부가 규칙 기반 결과로 fallback한다.
export async function generateJson<T>(req: Omit<LlmRequest, "json">): Promise<T | null> {
  const text = await generateText({ ...req, json: true });
  if (!text) return null;
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    console.warn(`[llm] JSON 파싱 실패: ${cleaned.slice(0, 80)}`);
    return null;
  }
}
