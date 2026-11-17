import { z } from "zod";
import type { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseReportPeriod } from "./summary";

const filters = z.object({
  jenis: z.enum(["pengeluaran", "transfer"]).optional(),
  halaman: z.coerce.number().int().min(1).max(10000).default(1),
});
export const movementPageSize = 25;

export function parseMovementFilters(params: URLSearchParams) {
  const period = parseReportPeriod(params.get("dari"), params.get("sampai"));
  const options = filters.safeParse({
    jenis: params.get("jenis") || undefined, halaman: params.get("halaman") ?? undefined,
  });
  return period.success && options.success ? { ...period.data, ...options.data } : null;
}

export function loadMovements(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  filter: NonNullable<ReturnType<typeof parseMovementFilters>>,
) {
  const start = (filter.halaman - 1) * movementPageSize;
  let query = supabase.from("stock_movements")
    .select("id, created_at, quantity, destination_id, product:products(name,sku,unit), source:warehouses!stock_movements_warehouse_id_fkey(name), destination:warehouses!stock_movements_destination_id_fkey(name)")
    .order("created_at", { ascending: false }).order("id", { ascending: false })
    .range(start, start + movementPageSize);
  if (filter.jenis === "transfer") query = query.not("destination_id", "is", null);
  if (filter.jenis === "pengeluaran") query = query.is("destination_id", null);
  if (filter.dari) query = query.gte("created_at", `${filter.dari}T00:00:00+07:00`);
  if (filter.sampai) query = query.lt("created_at", new Date(Date.parse(`${filter.sampai}T00:00:00+07:00`) + 86400000).toISOString());
  return query;
}

const wib = new Intl.DateTimeFormat("id-ID", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Jakarta" });

export function movementCells(row: {
  created_at: string; quantity: number; destination_id: string | null;
  product: { name: string; sku: string; unit: string } | null | unknown[];
  source: { name: string } | null | unknown[];
  destination: { name: string } | null | unknown[];
}): (string | number)[] {
  const product = Array.isArray(row.product) ? null : row.product;
  const source = Array.isArray(row.source) ? null : row.source;
  const destination = Array.isArray(row.destination) ? null : row.destination;
  return [wib.format(new Date(row.created_at)), row.destination_id ? "Transfer" : "Pengeluaran",
    product?.sku ?? "—", product?.name ?? "—", row.quantity, product?.unit ?? "—",
    source?.name ?? "—", row.destination_id ? destination?.name ?? "Di luar akses" : "—"];
}

export const movementHeaders = ["Waktu (WIB)", "Jenis", "SKU", "Barang", "Jumlah", "Satuan", "Gudang asal", "Gudang tujuan"];
