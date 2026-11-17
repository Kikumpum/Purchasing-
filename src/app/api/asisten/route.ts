import { NextResponse } from "next/server";
import { readSupabaseConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { assistantRequest, requestAiAnswer } from "@/features/assistant/ai";
import { guideTopics } from "@/features/assistant/guide";

export const maxDuration = 30;

// Best-effort burst protection within each server instance.
const windows = new Map<string, { expires: number; count: number }>();

function reply(body: object, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return reply({ error: "Permintaan tidak diizinkan." }, 403);
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return reply({ error: "Format pertanyaan tidak valid." }, 415);
  }
  // Read at most 8 KB, including requests without a Content-Length header.
  const reader = request.body?.getReader();
  if (!reader) return reply({ error: "Pertanyaan belum diisi." }, 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 8192) { await reader.cancel(); return reply({ error: "Pertanyaan terlalu panjang." }, 413); }
    chunks.push(value);
  }
  let body: unknown;
  try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { return reply({ error: "Format pertanyaan tidak valid." }, 400); }
  const parsed = assistantRequest.safeParse(body);
  if (!parsed.success) return reply({ error: "Tulis pertanyaan antara 2 dan 1.000 karakter." }, 400);
  if (!readSupabaseConfig(process.env).config) return reply({ error: "Layanan akun belum tersedia." }, 503);

  const supabase = await createSupabaseServerClient({ writableCookies: true });
  const { data, error } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (error || !id) return reply({ error: "Masuk ke akun Purchasing untuk menggunakan AI." }, 401);
  const profile = await supabase.from("profiles").select("role, active").eq("id", id).maybeSingle();
  if (!profile.data?.active || profile.error) return reply({ error: "Profil aktif diperlukan untuk menggunakan AI." }, 403);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return reply({ error: "Koneksi AI belum diaktifkan. Panduan otomatis tetap tersedia." }, 503);

  const now = Date.now();
  for (const [key, entry] of windows) if (entry.expires <= now) windows.delete(key);
  const window = windows.get(id) ?? { expires: now + 60000, count: 0 };
  if (window.count >= 5 || (!windows.has(id) && windows.size >= 1000)) {
    return reply({ error: "Tunggu sebentar sebelum mengirim pertanyaan berikutnya." }, 429);
  }
  window.count += 1;
  windows.set(id, window);
  try {
    const answer = await requestAiAnswer(parsed.data.question, profile.data.role, apiKey,
      process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
      guideTopics.map((topic) => `${topic.title}: ${topic.text}`).join("\n"));
    return reply({ answer });
  } catch {
    return reply({ error: "AI belum dapat menjawab. Coba lagi sebentar atau gunakan mode Panduan." }, 502);
  }
}
