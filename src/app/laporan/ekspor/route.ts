import { loadOperationalSummary, parseReportPeriod } from "@/features/reports/summary";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { readSupabaseConfig } from "@/lib/supabase/config";
import { loadMovements, movementCells, movementHeaders, movementPageSize, parseMovementFilters } from "@/features/reports/movements";

export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "private, no-store" };
const csvField = (value: string | number | null | undefined) => {
  const text = String(value ?? "");
  const safe = typeof value === "string" && /^[\s]*[=+@-]/.test(text) ? "'" + text : text;
  return `"${safe.replaceAll('"', '""')}"`;
};

function csvResponse(rows: (string | number | null | undefined)[][], filename: string) {
  return new Response("\uFEFF" + rows.map((row) => row.map(csvField).join(",")).join("\r\n") + "\r\n", {
    headers: { ...headers, "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"` },
  });
}

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
  if (searchParams.get("laporan") === "pergerakan") {
    if (!["warehouse", "admin_procurement"].includes(profile.data.role)) {
      return new Response("Akses laporan ditolak.", { status: 403, headers });
    }
    const filter = parseMovementFilters(searchParams);
    if (!filter) return new Response("Filter tidak valid.", { status: 400, headers });
    const result = await loadMovements(supabase, filter);
    if (result.error) return new Response("Laporan gagal dimuat. Coba lagi.", { status: 503, headers });
    return csvResponse([movementHeaders, ...result.data.slice(0, movementPageSize).map(movementCells)],
      `pergerakan-stok-${filter.halaman}.csv`);
  }

  const metrics = await loadOperationalSummary(supabase, profile.data.role, period.data);
  if (metrics.some((metric) => metric.count === null)) {
    return new Response("Laporan gagal dimuat. Coba lagi.", { status: 503, headers });
  }
  const rows = [
    ["Kategori", "Indikator", "Jumlah", "Dari (WIB)", "Sampai (WIB)"],
    ...metrics.map(({ category, label, count }) => [category, label, count, period.data.dari, period.data.sampai]),
  ];
  return csvResponse(rows, "laporan-operasional.csv");
}
