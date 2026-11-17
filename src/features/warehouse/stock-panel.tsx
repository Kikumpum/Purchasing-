import Link from "next/link";
import { randomUUID } from "node:crypto";
import type { createSupabaseServerClient } from "@/lib/supabase/server";
import { recordMovement, submitCount } from "@/features/warehouse/actions";

export const stockPageSize = 25;
type Supabase = Awaited<ReturnType<typeof createSupabaseServerClient>>;
type Warehouse = { id: string; name: string };

export function loadStockPage(supabase: Supabase, page: number) {
  const start = (page - 1) * stockPageSize;
  return supabase.from("inventory_availability")
    .select("warehouse_id, product_id, quantity, available, reserved")
    .order("warehouse_id").order("product_id").range(start, start + stockPageSize);
}

function stockHref(page: number) {
  return `/gudang?stok=${page}#gudang-stok`;
}

export function StockPanelLoading() {
  return <section className="setup-panel" id="gudang-stok" aria-busy="true"><h2>Saldo stok per gudang</h2><p role="status">Memuat saldo stok…</p></section>;
}

export async function StockPanel({ supabase, pending, warehouses, canManage, page }: {
  supabase: Supabase; pending: PromiseLike<Awaited<ReturnType<typeof loadStockPage>>>;
  warehouses: Warehouse[]; canManage: boolean; page: number;
}) {
  const stock = await pending;
  const ids = [...new Set(stock.data?.slice(0, stockPageSize).map((entry) => entry.product_id) ?? [])];
  const products = ids.length ? await supabase.from("products").select("id, name, unit").in("id", ids) : null;
  const productById = new Map((products?.data ?? []).map((product) => [product.id, product]));
  const warehouseById = new Map(warehouses.map((warehouse) => [warehouse.id, warehouse.name]));
  const hasNext = !stock.error && page < 100000 && stock.data.length > stockPageSize;

  return (
    <section className="setup-panel" id="gudang-stok" tabIndex={-1}>
      <h2>Saldo stok per gudang</h2>
      {stock.error || products?.error ? <p role="alert">Saldo stok gagal dimuat.</p>
        : stock.data.length === 0 ? <p>Belum ada saldo barang.</p>
        : <ul className="module-list">{stock.data.slice(0, stockPageSize).map((entry) => {
          const product = productById.get(entry.product_id);
          return (
            <li key={`${entry.warehouse_id}/${entry.product_id}`}>
              <div><h3>{product?.name ?? "Produk nonaktif"}</h3>
                <p>{warehouseById.get(entry.warehouse_id)} · {entry.quantity} {product?.unit}</p>
                <p>{entry.available} tersedia · {entry.reserved} dialokasikan</p>
                {!canManage && <details>
                  <summary className="inline-link cursor-pointer">Catat hasil hitung fisik</summary>
                  <form className="request-form" action={submitCount}>
                    <input type="hidden" name="id" value={randomUUID()} />
                    <input type="hidden" name="product" value={entry.product_id} />
                    <input type="hidden" name="warehouse" value={entry.warehouse_id} />
                    <label>Jumlah fisik<input name="actual" type="number" min={0} max={99999999} required /></label>
                    <label>Catatan<textarea name="note" required maxLength={500} rows={2} /></label>
                    <button className="button button-primary">Ajukan hasil hitung</button>
                  </form>
                </details>}
                {!canManage && entry.available > 0 && <details>
                  <summary className="inline-link cursor-pointer">Catat pengeluaran atau transfer</summary>
                  <form className="request-form" action={recordMovement}>
                    <input type="hidden" name="id" value={randomUUID()} />
                    <input type="hidden" name="product" value={entry.product_id} />
                    <input type="hidden" name="source" value={entry.warehouse_id} />
                    <label>Tujuan<select name="destination" defaultValue="">
                      <option value="">Pengeluaran dari gudang</option>
                      {warehouses.filter((warehouse) => warehouse.id !== entry.warehouse_id).map((warehouse) => (
                        <option key={warehouse.id} value={warehouse.id}>Transfer ke {warehouse.name}</option>
                      ))}
                    </select></label>
                    <label>Jumlah<input name="quantity" type="number" min={1} max={Math.min(entry.available, 1000000)} required /></label>
                    <label>Alasan atau referensi<textarea name="note" required maxLength={500} rows={2} /></label>
                    <button className="button button-primary">Simpan pergerakan</button>
                  </form>
                </details>}
              </div>
            </li>
          );
        })}</ul>}
      {!stock.error && <nav className="flex flex-wrap gap-4" aria-label="Halaman saldo stok">
        {page > 1 && <Link className="inline-link" href={stockHref(page - 1)}>Sebelumnya</Link>}
        {hasNext && <Link className="inline-link" href={stockHref(page + 1)}>Berikutnya</Link>}
      </nav>}
    </section>
  );
}
