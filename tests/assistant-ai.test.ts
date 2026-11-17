import assert from "node:assert/strict";
import { test } from "node:test";
import { AiQuotaError, requestAiAnswer } from "../src/features/assistant/ai";
import { assistantRequest } from "../src/features/assistant/chat-contract";

test("AI validates question bounds and sends only the question and static guidance", async () => {
  assert.equal(assistantRequest.safeParse({ question: "a".repeat(1001) }).success, false);
  let sent: Record<string, unknown> = {};
  const transport: typeof fetch = async (_url, options) => {
    sent = JSON.parse(String(options?.body));
    return Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: "Buka menu Gudang." }] } }] });
  };
  assert.equal(await requestAiAnswer({ question: "Cek stok", history: [] }, "warehouse", "fixture-test-key", "fixture-model", "Panduan pengujian", transport), "Buka menu Gudang.");
  assert.deepEqual(sent.contents, [{ role: "user", parts: [{ text: "Cek stok" }] }]);
  assert.deepEqual(sent.generationConfig, { maxOutputTokens: 600 });
});

test("provider failure and incomplete responses are not presented as successful answers", async () => {
  await assert.rejects(requestAiAnswer({ question: "Halo", history: [] }, "employee", "fixture-test-key", "fixture-model", "",
    async () => new Response("provider-error", { status: 429 })), AiQuotaError);
  await assert.rejects(requestAiAnswer({ question: "Halo", history: [] }, "employee", "fixture-test-key", "fixture-model", "",
    async () => Response.json({ candidates: [{ finishReason: "MAX_TOKENS", content: { parts: [{ text: "Belum selesai" }] } }] })));
});

test("sends prior turns in order so Gemini can answer a follow-up", async () => {
  const history = [{ question: "Bagaimana menerima PO?", answer: "Buka menu Gudang." }];
  const input = { question: "Kalau baru separuh?", history };
  const parsed = assistantRequest.parse(input);
  assert.deepEqual(parsed.history, history);
  assert.equal(assistantRequest.safeParse({ ...input, history: Array(4).fill(history[0]) }).success, false);
  await requestAiAnswer(parsed, "warehouse", "fixture-test-key", "fixture-model", "", async (_url, options) => {
    assert.deepEqual(JSON.parse(String(options?.body)).contents, [
      { role: "user", parts: [{ text: history[0].question }] },
      { role: "model", parts: [{ text: history[0].answer }] },
      { role: "user", parts: [{ text: input.question }] },
    ]);
    return Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: "Catat jumlah yang benar-benar diterima." }] } }] });
  });
});
