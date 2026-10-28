// docs/prd/07-external-api-integration.md "AI 추천 로직" 참조.
// LLM 공급자(Gemini/Anthropic)를 교체 가능하게 하는 공통 인터페이스.
// 에이전트 코드는 공급자를 직접 import하지 않고 src/lib/llm/index.ts만 사용한다.

export type LlmProviderName = "gemini" | "anthropic";

export interface LlmRequest {
  system?: string;
  prompt: string;
  // true면 JSON 객체만 반환하도록 공급자별 JSON 모드를 켠다.
  json?: boolean;
  maxTokens?: number;
  // 시도 1회당 대기 상한. 사용자 요청 경로는 기본값(짧게)을 쓰고, 오프라인
  // 배치 작업(scripts/build-places.ts)처럼 출력이 긴 호출만 늘린다.
  timeoutMs?: number;
}

export interface LlmProvider {
  name: LlmProviderName;
  // 키 미설정·네트워크 오류·한도 초과 등 모든 실패는 null — 호출부가
  // 규칙 기반 로직으로 fallback한다 (tourApi.ts/ncpMap.ts와 같은 규약).
  generateText(req: LlmRequest): Promise<string | null>;
}
