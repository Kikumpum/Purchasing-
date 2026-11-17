import { z } from "zod";

export const assistantRequest = z.object({
  question: z.string().trim().min(2).max(1000),
});

const responseSchema = z.object({
  status: z.string(),
  output: z.array(z.object({
    content: z.array(z.object({
      type: z.string(),
      text: z.string().optional(),
    })).optional(),
  })),
});

export async function requestAiAnswer(question: string, role: string, apiKey: string, model: string,
  guide: string, transport: typeof fetch = fetch): Promise<string> {
  const response = await transport("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model, store: false, max_output_tokens: 600,
      instructions: `Anda Asisten Purchasing Aryocorp. Jawab singkat dalam bahasa Indonesia.
Bantu panduan aplikasi dan pertanyaan umum. Peran pengguna terverifikasi adalah ${role}.
Untuk fitur Purchasing, gunakan panduan terlampir sebagai sumber. Jika rincian tidak tersedia, katakan belum diketahui.
Anda tidak dapat membaca saldo, dokumen, email akun, atau data transaksi langsung, serta tidak menjalankan perubahan.
Jangan mengarang fitur, akses, transaksi, atau keberhasilan tindakan.
Jangan meminta password, OTP, API key atau rahasia lain.
Untuk saldo dan dokumen, arahkan pengguna ke menu yang sesuai dan jelaskan bahwa akses mengikuti akunnya.
Panduan aplikasi:
${guide}`,
      input: question,
    }),
    signal: AbortSignal.timeout(20000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Layanan AI tidak tersedia.");
  const result = responseSchema.parse(await response.json());
  const text = result.output.flatMap((entry) => entry.content ?? [])
    .filter((entry) => entry.type === "output_text").map((entry) => entry.text ?? "").join("\n").trim();
  if (result.status !== "completed" || !text) throw new Error("Jawaban AI belum tersedia.");
  return text;
}
