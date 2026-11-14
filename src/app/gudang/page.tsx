import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { requireRequestSession } from "@/features/requests/session";
import { createWarehouse, issueReservation, receiveOrder, recordMovement, reviewCount, submitCount } from "@/features/warehouse/actions";

type WarehouseOrder = {
  id: string; number: number; item_name: string; item_sku: string | null; item_unit: string | null;
  warehouse_name: string; quantity: number; received: number; status: string;
};

const errors: Record<string, string> = {
  input: "Periksa isian formulir.",
  warehouse: "Gudang gagal disimpan. Periksa apakah kodenya sudah digunakan.",
  receipt: "Penerimaan gagal disimpan. Periksa gudang dan sisa pesanan.",
  movement: "Pergerakan stok gagal disimpan. Periksa saldo dan akses gudang.",
  issue: "Pengeluaran PR gagal disimpan. Periksa sisa alokasi.",
  count: "Hasil hitung gagal disimpan. Periksa produk dan akses gudang.",
  "count-review": "Review gagal. Jika saldo berubah, tolak hasil ini dan minta hitung ulang.",
};

export default async function WarehousePage({ searchParams }: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { error, saved } = await searchParams;
  const { profile, supabase } = await requireRequestSession();
  const canManage = profile?.role === "admin_procurement";
  if (!canManage && profile?.role !== "warehouse") redirect("/permintaan");

  const [warehouses, orders, stock, movements, counts, reservations] = await Promise.all([
    supabase.from("warehouses").select("id, code, name").order("code"),
    canManage ? null : supabase.rpc("warehouse_orders"),
    supabase.from("inventory_availability").select("warehouse_id, product_id, quantity, available, reserved")
      .order("warehouse_id").order("product_id"),
    supabase.from("stock_movements").select("id, product_id, warehouse_id, destination_id, quantity, note, created_at")
      .order("created_at", { ascending: false }).order("id").limit(25),
    supabase.from("stock_counts").select("id, product_id, warehouse_id, expected_quantity, actual_quantity, note, status")
      .order("counted_at", { ascending: false }).order("id").limit(25),
    supabase.from("stock_reservation_balances").select("id, request_id, product_id, warehouse_id, remaining")
      .gt("remaining", 0).order("created_at").order("id").limit(25),
  ]);
  const productIds = [...new Set([
    ...(stock.data ?? []).map((row) => row.product_id),
    ...(movements.data ?? []).map((row) => row.product_id),
    ...(counts.data ?? []).map((row) => row.product_id),
    ...(reservations.data ?? []).map((row) => row.product_id),
  ])];
  const warehouseOrders: WarehouseOrder[] = orders?.data ?? [];
  const products = productIds.length
    ? await supabase.from("products").select("id, name, sku, unit").in("id", productIds)
    : null;
  const productById = new Map((products?.data ?? []).map((product) => [product.id, product]));
  const warehouseById = new Map((warehouses.data ?? []).map((warehouse) => [warehouse.id, warehouse.name]));

  return (
    <WorkspaceShell current="warehouse" canProcure={canManage} canWarehouse>
      <div className="page-heading"><h1>Gudang</h1></div>
      {error && errors[error] && <p role="alert" className="copy-error">{errors[error]}</p>}
      {saved === "1" && <p role="status">Data tersimpan.</p>}
      <div className="setup-grid">
        <section className="setup-panel">
          <h2>{canManage ? "Daftar gudang" : "Penerimaan PO"}</h2>
          {canManage ? (
            warehouses.error ? <p role="alert">Gudang gagal dimuat.</p>
              : warehouses.data.length === 0 ? <p>Belum ada gudang.</p>
              : <ul className="module-list">{warehouses.data.map((warehouse) => (
                <li key={warehouse.id}>{warehouse.code} · {warehouse.name}</li>
              ))}</ul>
          ) : orders?.error ? <p role="alert">Daftar PO gagal dimuat.</p>
            : !warehouseOrders.length ? <p>Belum ada PO untuk gudang yang ditugaskan kepada Anda.</p>
            : <ul className="module-list">{warehouseOrders.map((order) => {
              const remaining = order.quantity - order.received;
              return (
                <li key={order.id}><div className="w-full min-w-0">
                  <h3 className="wrap-anywhere">PO-{order.number} · {order.item_name}</h3>
                  <p>{order.warehouse_name} · Diterima {order.received} dari {order.quantity} {order.item_unit}</p>
                  {remaining > 0 && <form className="request-form" action={receiveOrder}>
                    <input type="hidden" name="id" value={randomUUID()} />
                    <input type="hidden" name="order" value={order.id} />
                    <label>Jumlah diterima<input name="quantity" type="number" min={1} max={remaining} required /></label>
                    <label>Catatan<textarea name="note" rows={2} maxLength={500} /></label>
                    <button className="button button-primary">Catat penerimaan</button>
                  </form>}
                </div></li>
              );
            })}</ul>}
        </section>
        {canManage && <section className="setup-panel">
          <h2>Gudang baru</h2>
          <form className="request-form" action={createWarehouse}>
            <label>Kode gudang<input name="code" required maxLength={40} /></label>
            <label>Nama gudang<input name="name" required maxLength={160} /></label>
            <button className="button button-primary">Tambah gudang</button>
          </form>
        </section>}
        <section className="setup-panel">
          <h2>Saldo stok per gudang</h2>
          {stock.error || products?.error ? <p role="alert">Saldo stok gagal dimuat.</p>
            : stock.data.length === 0 ? <p>Belum ada saldo barang.</p>
            : <ul className="module-list">{stock.data.map((entry) => {
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
                          {warehouses.data?.filter((warehouse) => warehouse.id !== entry.warehouse_id).map((warehouse) => (
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
        </section>
        <section className="setup-panel">
          <h2>Pengeluaran untuk PR</h2>
          {reservations.error ? <p role="alert">Alokasi gagal dimuat.</p>
            : reservations.data.length === 0 ? <p>Tidak ada alokasi yang menunggu pengeluaran.</p>
            : <ul className="module-list">{reservations.data.map((entry) => (
              <li key={entry.id}><div className="w-full min-w-0">
                <h3>{productById.get(entry.product_id)?.name ?? entry.product_id}</h3>
                <p>{warehouseById.get(entry.warehouse_id)} · Sisa {entry.remaining}</p>
                <p className="wrap-anywhere">Referensi PR {entry.request_id}</p>
                {!canManage && <form action={issueReservation} className="request-form">
                  <input type="hidden" name="id" value={randomUUID()} />
                  <input type="hidden" name="reservation" value={entry.id} />
                  <label>Jumlah keluar<input name="quantity" type="number" min={1} max={entry.remaining} required /></label>
                  <label>Penerima atau referensi serah terima<textarea name="note" rows={2} maxLength={500} required /></label>
                  <button className="button button-primary">Keluarkan stok PR</button>
                </form>}
              </div></li>
            ))}</ul>}
        </section>
        <section className="setup-panel">
          <h2>Opname</h2>
          {counts.error ? <p role="alert">Hasil opname gagal dimuat.</p>
            : counts.data.length === 0 ? <p>Belum ada hasil opname.</p>
            : <ul className="module-list">{counts.data.map((count) => (
              <li key={count.id}><div className="min-w-0">
                <h3>{productById.get(count.product_id)?.name ?? count.product_id}</h3>
                <p>{warehouseById.get(count.warehouse_id)} · Sistem {count.expected_quantity} · Fisik {count.actual_quantity}</p>
                <p className="wrap-anywhere">{count.note}</p>
                <p>{count.status === "pending" ? "Menunggu review" : count.status === "approved" ? "Disetujui" : "Ditolak"}</p>
                {canManage && count.status === "pending" && <form action={reviewCount} className="flex flex-wrap gap-2">
                  <input type="hidden" name="id" value={count.id} />
                  <button className="button button-primary" name="review" value="approved">Setujui penyesuaian</button>
                  <button className="button" name="review" value="rejected">Tolak</button>
                </form>}
              </div></li>
            ))}</ul>}
        </section>
        <section className="setup-panel">
          <h2>Pergerakan stok terakhir</h2>
          {movements.error ? <p role="alert">Riwayat gagal dimuat.</p>
            : movements.data.length === 0 ? <p>Belum ada pengeluaran atau transfer.</p>
            : <ul className="module-list">{movements.data.map((movement) => (
              <li key={movement.id}><div className="min-w-0">
                <h3>{movement.destination_id ? "Transfer" : "Pengeluaran"} · {movement.quantity} {productById.get(movement.product_id)?.name ?? movement.product_id}</h3>
                <p>{warehouseById.get(movement.warehouse_id) ?? "Gudang asal"}
                  {movement.destination_id && ` → ${warehouseById.get(movement.destination_id) ?? "Gudang tujuan"}`}</p>
                <p className="wrap-anywhere">{movement.note}</p>
                <time dateTime={movement.created_at}>{new Intl.DateTimeFormat("id-ID", {
                  dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta",
                }).format(new Date(movement.created_at))}</time>
              </div></li>
            ))}</ul>}
        </section>
      </div>
    </WorkspaceShell>
  );
}
