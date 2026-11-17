import assert from "node:assert/strict";
import { test } from "node:test";
import { assistantRequest, requestAiAnswer } from "../src/features/assistant/ai";

test("AI validates question bounds and sends only the question and static guidance", async () => {
  assert.equal(assistantRequest.safeParse({ question: "a".repeat(1001) }).success, false);
  let sent: Record<string, unknown> = {};
  const transport: typeof fetch = async (_url, options) => {
    sent = JSON.parse(String(options?.body));
    return Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: "Buka menu Gudang." }] } }] });
  };
  assert.equal(await requestAiAnswer("Cek stok", "warehouse", "fixture-test-key", "fixture-model", "Panduan pengujian", transport), "Buka menu Gudang.");
  assert.deepEqual(sent.contents, [{ role: "user", parts: [{ text: "Cek stok" }] }]);
  assert.deepEqual(sent.generationConfig, { maxOutputTokens: 600 });
});

test("provider failure and incomplete responses are not presented as successful answers", async () => {
  await assert.rejects(requestAiAnswer("Halo", "employee", "fixture-test-key", "fixture-model", "",
    async () => new Response("provider-error", { status: 429 })));
  await assert.rejects(requestAiAnswer("Halo", "employee", "fixture-test-key", "fixture-model", "",
    async () => Response.json({ candidates: [{ finishReason: "MAX_TOKENS", content: { parts: [{ text: "Belum selesai" }] } }] })));
});
