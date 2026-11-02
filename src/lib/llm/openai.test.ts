import { strict as assert } from "node:assert";
import { test } from "node:test";
import { extractText, openaiProvider, type ResponsesPayload } from "./openai";

// Responses API 응답 한 벌. output[]에 추론 항목 같은 다른 type이 섞여 올 수 있어
// message만 골라 읽는지도 함께 본다.
function payload(overrides: Partial<ResponsesPayload> = {}): ResponsesPayload {
  return {
    status: "completed",
    output: [
      { type: "reasoning", content: [] },
      { type: "message", content: [{ type: "output_text", text: '{"title":"비 오는 날 실내 한 바퀴"}' }] },
    ],
    ...overrides,
  };
}

test("message 항목의 output_text를 꺼낸다", () => {
  assert.equal(extractText(payload()), '{"title":"비 오는 날 실내 한 바퀴"}');
});

test("나뉘어 온 텍스트는 이어 붙인다", () => {
  const data = payload({
    output: [
      {
        type: "message",
        content: [
          { type: "output_text", text: "앞부분" },
          { type: "output_text", text: "뒷부분" },
        ],
      },
    ],
  });

  assert.equal(extractText(data), "앞부분뒷부분");
});

test("안전 분류기가 거절하면 null", () => {
  const data = payload({
    output: [{ type: "message", content: [{ type: "refusal", text: "도와드릴 수 없습니다" }] }],
  });

  assert.equal(extractText(data), null);
});

test("max_output_tokens로 잘린 응답은 쓰지 않는다", () => {
  // 잘린 JSON을 그대로 넘기면 호출부가 깨진 값을 받는다 — 폴백이 낫다.
  const data = payload({
    status: "incomplete",
    incomplete_details: { reason: "max_output_tokens" },
    output: [{ type: "message", content: [{ type: "output_text", text: '{"title":"비 오는' }] }],
  });

  assert.equal(extractText(data), null);
});

test("빈 출력과 message 없는 응답은 null", () => {
  assert.equal(extractText(payload({ output: [] })), null);
  assert.equal(
    extractText(payload({ output: [{ type: "message", content: [{ type: "output_text", text: "  " }] }] })),
    null,
  );
  assert.equal(extractText({}), null);
});

test("키가 없으면 호출하지 않고 null", async () => {
  const saved = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    assert.equal(await openaiProvider.generateText({ prompt: "안녕" }), null);
  } finally {
    if (saved !== undefined) process.env.OPENAI_API_KEY = saved;
  }
});
