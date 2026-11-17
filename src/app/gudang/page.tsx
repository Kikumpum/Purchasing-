import { Suspense } from "react";
import { loadStockPage, StockPanel, StockPanelLoading } from "@/features/warehouse/stock-panel";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { SectionLinks } from "@/components/section-links";
import { requireRequestSession } from "@/features/requests/session";
import { createWarehouse, issueReservation, receiveOrder, reviewCount } from "@/features/warehouse/actions";

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
  searchParams: Promise<{ error?: string; saved?: string; stok?: string }>;
}) {
  const { error, saved, stok } = await searchParams;
  const { profile, supabase } = await requireRequestSession();
  const canManage = profile?.role === "admin_procurement";
  if (!canManage && profile?.role !== "warehouse") redirect("/permintaan");

  const stockPage = typeof stok === "string" && /^(?:[1-9]\d{0,4}|100000)$/.test(stok) ? Number(stok) : 1;
  const stock = Promise.resolve(loadStockPage(supabase, stockPage));
  const [warehouses, orders, movements, counts, reservations] = await Promise.all([
    supabase.from("warehouses").select("id, code, name").order("code"),
    canManage ? null : supabase.rpc("warehouse_orders"),
    supabase.from("stock_movements").select("id, product_id, warehouse_id, destination_id, quantity, note, created_at, recipient, shipping_reference")
      .order("created_at", { ascending: false }).order("id").limit(25),
    supabase.from("stock_counts").select("id, product_id, warehouse_id, expected_quantity, actual_quantity, note, status")
      .order("counted_at", { ascending: false }).order("id").limit(25),
    supabase.from("stock_reservation_balances").select("id, request_id, product_id, warehouse_id, remaining")
      .gt("remaining", 0).order("created_at").order("id").limit(25),
  ]);
  const productIds = [...new Set([
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
      <SectionLinks links={[
        ["gudang-penerimaan", canManage ? "Daftar gudang" : "Penerimaan PO"],
        ["gudang-stok", "Saldo stok"], ["gudang-pengeluaran", "Pengeluaran PR"],
        ["gudang-opname", "Opname"], ["gudang-riwayat", "Riwayat stok"],
      ]} />
      {error && errors[error] && <p role="alert" className="copy-error">{errors[error]}</p>}
      {saved === "1" && <p role="status">Data tersimpan.</p>}
      <div className="setup-grid">
        <section className="setup-panel" id="gudang-penerimaan" tabIndex={-1}>
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
                <li key={order.id} id={`penerimaan-${order.id}`} tabIndex={-1}><div className="w-full min-w-0">
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
        <Suspense fallback={<StockPanelLoading />}>
          <StockPanel supabase={supabase} pending={stock} warehouses={warehouses.data ?? []} canManage={canManage} page={stockPage} />
        </Suspense>
        <section className="setup-panel" id="gudang-pengeluaran" tabIndex={-1}>
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
                  <label>Penerima<input name="recipient" maxLength={160} required /></label>
                  <label>Referensi pengiriman (opsional)<input name="shippingReference" maxLength={120} placeholder="Nomor resi, surat jalan, atau armada" /></label>
                  <label>Catatan serah terima<textarea name="note" rows={2} maxLength={500} required /></label>
                  <button className="button button-primary">Keluarkan stok PR</button>
                </form>}
              </div></li>
            ))}</ul>}
        </section>
        <section className="setup-panel" id="gudang-opname" tabIndex={-1}>
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
        <section className="setup-panel" id="gudang-riwayat" tabIndex={-1}>
          <h2>Pergerakan stok terakhir</h2>
          {movements.error ? <p role="alert">Riwayat gagal dimuat.</p>
            : movements.data.length === 0 ? <p>Belum ada pengeluaran atau transfer.</p>
            : <ul className="module-list">{movements.data.map((movement) => (
              <li key={movement.id}><div className="min-w-0">
                <h3>{movement.destination_id ? "Transfer" : "Pengeluaran"} · {movement.quantity} {productById.get(movement.product_id)?.name ?? movement.product_id}</h3>
                <p>{warehouseById.get(movement.warehouse_id) ?? "Gudang asal"}
                  {movement.destination_id && ` → ${warehouseById.get(movement.destination_id) ?? "Gudang tujuan"}`}</p>
                <p className="wrap-anywhere">{movement.note}</p>
                {movement.recipient && <p className="wrap-anywhere">Penerima {movement.recipient}</p>}
                {movement.shipping_reference && <p className="wrap-anywhere">Referensi pengiriman {movement.shipping_reference}</p>}
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
