import assert from "node:assert/strict";
import { test } from "node:test";
import { POST } from "../src/app/api/asisten/route";

function request(body: string, origin = "https://purchasing.example") {
  return new Request("https://purchasing.example/api/asisten", {
    method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body,
  });
}

test("AI endpoint rejects foreign origins before authentication or provider calls", async () => {
  const response = await POST(request('{"question":"Halo"}', "https://foreign.example"));
  assert.equal(response.status, 403);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
});

test("AI endpoint rejects malformed and oversized input", async () => {
  assert.equal((await POST(request("{"))).status, 400);
  assert.equal((await POST(request(JSON.stringify({ question: "a".repeat(1001) })))).status, 400);
  assert.equal((await POST(request("a".repeat(8200)))).status, 413);
});
