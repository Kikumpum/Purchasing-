import assert from "node:assert/strict";
import { test } from "node:test";
import { readSupabaseConfig } from "../src/lib/supabase/config";

const KEY = "sb_publishable_fixture";
const URL = "https://fixture.supabase.co";

test("reports missing settings individually", () => {
  assert.deepEqual(readSupabaseConfig({}), {
    config: null,
    fields: { url: "missing", key: "missing" },
  });
});

test("accepts publishable settings and normalizes whitespace", () => {
  assert.deepEqual(readSupabaseConfig({
    NEXT_PUBLIC_SUPABASE_URL: ` ${URL} `,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: KEY,
  }), { config: { url: URL, key: KEY }, fields: { url: "valid", key: "valid" } });
});

test("supports local Supabase and legacy public keys", () => {
  const legacy = `e30.${Buffer.from('{"role":"anon"}').toString("base64url")}.fixture`;
  const { config } = readSupabaseConfig({
    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: legacy,
  });
  assert.equal(config?.key, legacy);
});

test("rejects credentials in URL, HTTP outside loopback, and privileged keys", () => {
  const secret = `e30.${Buffer.from('{"role":"service_role"}').toString("base64url")}.fixture`;
  for (const url of ["https://user:pass@example.org", "http://example.org", "https://example.org/rest/v1", "invalid"]) {
    const result = readSupabaseConfig({
      NEXT_PUBLIC_SUPABASE_URL: url,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: secret,
    });
    assert.deepEqual(result, { config: null, fields: { url: "invalid", key: "invalid" } });
  }
  assert.equal(readSupabaseConfig({ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_secret_fixture" }).fields.key, "invalid");
});
