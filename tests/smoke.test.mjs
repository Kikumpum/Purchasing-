import assert from "node:assert/strict";
import { test } from "node:test";

const origin = process.env.PURCHASING_SMOKE_URL ?? "http://localhost:3000";

test("overview provides the workspace and configuration route", async () => {
  const response = await fetch(new URL("/", origin));
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Ringkasan workspace/);
  assert.match(html, /href="\/konfigurasi"/);
});

test("configuration shows status and the public environment template", async () => {
  const response = await fetch(new URL("/konfigurasi", origin));
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Status konfigurasi/);
  assert.match(html, /NEXT_PUBLIC_SUPABASE_URL=/);
  assert.match(html, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=/);
});

test("unknown pages return a workspace 404", async () => {
  const response = await fetch(new URL("/halaman-tidak-ada", origin));
  assert.equal(response.status, 404);
  assert.match(await response.text(), /Halaman tidak ditemukan/);
});
