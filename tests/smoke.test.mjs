import assert from "node:assert/strict";
import { test } from "node:test";

const origin = process.env.PURCHASING_SMOKE_URL ?? "http://localhost:3000";
const hosted = process.env.PURCHASING_SMOKE_HOSTED === "1";

test("overview provides the workspace and configuration route", { skip: hosted }, async () => {
  const response = await fetch(new URL("/", origin));
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Ringkasan workspace/);
  assert.match(html, /href="\/konfigurasi"/);
});

test("configuration shows status and the public environment template", { skip: hosted }, async () => {
  const response = await fetch(new URL("/konfigurasi", origin));
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Status konfigurasi/);
  assert.match(html, /NEXT_PUBLIC_SUPABASE_URL=/);
  assert.match(html, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=/);
});

test("production opens the branded sign-in screen without workspace menus", { skip: !hosted }, async () => {
  const response = await fetch(new URL("/", origin));
  assert.equal(response.status, 200);
  assert.equal(new URL(response.url).pathname, "/masuk");
  const html = await response.text();
  assert.match(html, /Aryocorp/);
  assert.match(html, /name="email"/);
  assert.doesNotMatch(html, /aria-label="Navigasi utama"|Panduan Supabase/);
});

test("production gates private pages and CSV exports for guests", { skip: !hosted }, async () => {
  for (const path of ["/konfigurasi", "/dashboard", "/permintaan", "/gudang", "/pengadaan", "/laporan"]) {
    const response = await fetch(new URL(path, origin));
    assert.equal(response.status, 200, path);
    assert.equal(new URL(response.url).pathname, "/masuk", path);
  }
  const report = await fetch(new URL("/laporan/ekspor", origin), { redirect: "manual" });
  assert.equal(report.status, 401);
  assert.match(report.headers.get("cache-control") ?? "", /no-store/);
});

test("unknown pages return a workspace 404", async () => {
  const response = await fetch(new URL("/halaman-tidak-ada", origin));
  assert.equal(response.status, 404);
  assert.match(await response.text(), /Halaman tidak ditemukan/);
});
