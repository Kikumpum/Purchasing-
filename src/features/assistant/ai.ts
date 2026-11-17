import { z } from "zod";

export const assistantRequest = z.object({
  question: z.string().trim().min(2).max(1000),
});

const responseSchema = z.object({
  candidates: z.array(z.object({
    finishReason: z.string(),
    content: z.object({ parts: z.array(z.object({ text: z.string().optional(), thought: z.boolean().optional() })) }).optional(),
  })).min(1),
});

export async function requestAiAnswer(question: string, role: string, apiKey: string, model: string,
  guide: string, transport: typeof fetch = fetch): Promise<string> {
  const response = await transport(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      generationConfig: { maxOutputTokens: 600 },
      systemInstruction: { parts: [{ text: `Anda Asisten Purchasing Aryocorp. Jawab singkat dalam bahasa Indonesia.
Bantu panduan aplikasi dan pertanyaan umum. Peran pengguna terverifikasi adalah ${role}.
Untuk fitur Purchasing, gunakan panduan terlampir sebagai sumber. Jika rincian tidak tersedia, katakan belum diketahui.
Anda tidak dapat membaca saldo, dokumen, email akun, atau data transaksi langsung, serta tidak menjalankan perubahan.
Jangan mengarang fitur, akses, transaksi, atau keberhasilan tindakan.
Jangan meminta password, OTP, API key atau rahasia lain.
Untuk saldo dan dokumen, arahkan pengguna ke menu yang sesuai dan jelaskan bahwa akses mengikuti akunnya.
Panduan aplikasi:
${guide}` }] },
      contents: [{ role: "user", parts: [{ text: question }] }],
    }),
    signal: AbortSignal.timeout(20000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Layanan AI tidak tersedia.");
  const result = responseSchema.parse(await response.json());
  const candidate = result.candidates[0];
  const text = (candidate.content?.parts ?? []).filter((part) => !part.thought)
    .map((part) => part.text ?? "").join("\n").trim();
  if (candidate.finishReason !== "STOP" || !text) throw new Error("Jawaban AI belum tersedia.");
  return text;
}
