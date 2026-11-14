import { z } from "zod";
import type { createSupabaseServerClient } from "@/lib/supabase/server";
import { statusLabel } from "@/features/requests/session";

const dateField = z.iso.date().refine((date) => date >= "1900-01-01" && date <= "9998-12-31");
const filterSchema = z.object({ dari: dateField.optional(), sampai: dateField.optional() })
  .refine(({ dari, sampai }) => !dari || !sampai || dari <= sampai);

export function parseReportPeriod(dari: unknown, sampai: unknown) {
  return filterSchema.safeParse({
    dari: dari === "" || dari === null ? undefined : dari,
    sampai: sampai === "" || sampai === null ? undefined : sampai,
  });
}

type Period = z.infer<typeof filterSchema>;
type Supabase = Awaited<ReturnType<typeof createSupabaseServerClient>>;
type Table = "purchase_requests" | "purchase_orders" | "goods_receipts" | "stock_movements" | "stock_counts";
type Metric = { category: string; label: string; count: number | null };

export async function loadOperationalSummary(supabase: Supabase, role: string, period: Period): Promise<Metric[]> {
  const start = period.dari && new Date(`${period.dari}T00:00:00+07:00`).toISOString();
  const end = period.sampai && new Date(Date.parse(`${period.sampai}T00:00:00+07:00`) + 86400000).toISOString();

  async function metric(
    table: Table,
    dateColumn: string,
    category: string,
    label: string,
    status?: string,
  ): Promise<Metric> {
    let query = supabase.from(table).select("id", { count: "exact", head: true });
    if (status) query = query.eq("status", status);
    if (start) query = query.gte(dateColumn, start);
    if (end) query = query.lt(dateColumn, end);
    const { count, error } = await query;
    return { category, label, count: error ? null : count };
  }

  const requestMetrics = role === "admin_procurement"
    ? [["approved", statusLabel.approved]]
    : Object.entries(statusLabel);
  const requests = role === "warehouse" ? [] : requestMetrics.map(([status, label]) =>
    metric("purchase_requests", "created_at", "Permintaan pembelian", label, status),
  );
  const orders = role === "admin_procurement"
    ? [metric("purchase_orders", "created_at", "Pengadaan", "Purchase order")]
    : [];
  const warehouse = role === "warehouse" || role === "admin_procurement" ? [
    metric("goods_receipts", "received_at", "Gudang", "Penerimaan barang"),
    metric("stock_movements", "created_at", "Gudang", "Pengeluaran dan transfer"),
    metric("stock_counts", "counted_at", "Gudang", "Opname menunggu review", "pending"),
  ] : [];

  return Promise.all([...requests, ...orders, ...warehouse]);
}
