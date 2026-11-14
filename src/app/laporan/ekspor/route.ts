import { loadOperationalSummary, parseReportPeriod } from "@/features/reports/summary";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { readSupabaseConfig } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "private, no-store" };
const csvField = (value: string | number | null | undefined) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = parseReportPeriod(searchParams.get("dari"), searchParams.get("sampai"));
  if (!period.success) return new Response("Periode tidak valid.", { status: 400, headers });
  if (!readSupabaseConfig(process.env).config) {
    return new Response("Supabase belum dikonfigurasi.", { status: 503, headers });
  }

  const supabase = await createSupabaseServerClient({ writableCookies: true });
  const claims = await supabase.auth.getClaims();
  if (claims.error || !claims.data?.claims.sub) {
    return new Response("Masuk untuk mengunduh laporan.", { status: 401, headers });
  }

  const profile = await supabase.from("profiles").select("role")
    .eq("id", claims.data.claims.sub).maybeSingle();
  if (profile.error) return new Response("Profil gagal dimuat.", { status: 503, headers });
  if (!profile.data) return new Response("Akses laporan ditolak.", { status: 403, headers });

  const metrics = await loadOperationalSummary(supabase, profile.data.role, period.data);
  if (metrics.some((metric) => metric.count === null)) {
    return new Response("Laporan gagal dimuat. Coba lagi.", { status: 503, headers });
  }
  const rows = [
    ["Kategori", "Indikator", "Jumlah", "Dari (WIB)", "Sampai (WIB)"],
    ...metrics.map(({ category, label, count }) => [category, label, count, period.data.dari, period.data.sampai]),
  ];
  return new Response("\uFEFF" + rows.map((row) => row.map(csvField).join(",")).join("\r\n") + "\r\n", {
    headers: {
      ...headers,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="laporan-operasional.csv"',
    },
  });
}
