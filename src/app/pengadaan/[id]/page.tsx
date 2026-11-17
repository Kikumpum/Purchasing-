import Link from "next/link";
import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { z } from "zod";
import { WorkspaceShell } from "@/components/workspace-shell";
import { SectionLinks } from "@/components/section-links";
import { createPurchaseOrder, manageReservation, recordQuotation, transitionPurchaseOrder } from "@/features/procurement/order-actions";
import { requireProcurementSession } from "@/features/procurement/session";

const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" });
const messages: Record<string, string> = {
  reservation: "Alokasi gagal diperbarui. Periksa stok tersedia, jumlah PR, dan status PO atau pengeluaran.",
  quotation: "Penawaran gagal disimpan. Periksa harga, masa berlaku, dan status vendor.",
  order: "PO gagal dibuat. Periksa masa berlaku penawaran, status vendor, dan PO yang sudah ada.",
  transition: "Status PO gagal diubah. Periksa status, gudang, produk, masa berlaku penawaran, atau alasan pembatalan.",
};
const statuses: Record<string, string> = {
  draft: "Draft", sent: "Terkirim", cancelled: "Dibatalkan", partial: "Diterima sebagian", received: "Diterima",
};

export default async function ProcurementRequestPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { error } = await searchParams;
  const supabase = await requireProcurementSession();
  const [pr, vendors, quotations, orders, warehouses, products, reservations] = await Promise.all([
    supabase.from("purchase_requests").select("number, item_name, item_unit, quantity, need_by, product_id")
      .eq("id", id).eq("status", "approved").maybeSingle(),
    supabase.from("vendors").select("id, name, code").eq("active", true).order("name").order("id"),
    supabase.from("quotations").select("id, vendor_name, unit_price, valid_until, note").eq("request_id", id)
      .order("unit_price").order("id"),
    supabase.from("purchase_orders").select("id, number, status, vendor_name, quantity, unit_price, total, cancellation_reason, product_id, warehouse_id")
      .eq("request_id", id).order("number", { ascending: false }),
    supabase.from("warehouses").select("id, code, name").eq("active", true).order("code"),
    supabase.from("products").select("id, sku, name").eq("active", true).order("sku"),
    supabase.from("stock_reservation_balances").select("id, warehouse_id, quantity, remaining, receipt_id").eq("request_id", id),
  ]);
  if (pr.error || vendors.error || quotations.error || orders.error || warehouses.error || products.error || reservations.error) {
    throw new Error("Data pengadaan gagal dimuat.");
  }
  if (!pr.data) notFound();
  const stock = pr.data.product_id ? await supabase.from("inventory_availability")
    .select("warehouse_id, available").eq("product_id", pr.data.product_id).gt("available", 0) : null;
  if (stock?.error) throw new Error("Ketersediaan stok gagal dimuat.");
  const availableByWarehouse = new Map((stock?.data ?? []).map((row) => [row.warehouse_id, row.available]));
  const sourceWarehouses = warehouses.data.filter((warehouse) => availableByWarehouse.has(warehouse.id));
  const activeOrder = orders.data.find((order) => order.status !== "cancelled");
  const remaining = pr.data.quantity - reservations.data.reduce(
    (total, row) => total + (row.receipt_id ? 0 : row.quantity), 0,
  );
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta" }).format(new Date());

  return (
    <WorkspaceShell current="procurement">
      <div className="page-heading">
        <Link className="inline-link" href="/pengadaan">Kembali ke antrean</Link>
        <h1>Pengadaan PR-{pr.data.number}</h1>
        <p>{pr.data.item_name} · {pr.data.quantity} {pr.data.item_unit} · Kebutuhan {pr.data.need_by}</p>
        <Link className="inline-link" href={`/permintaan/${id}`}>Lihat permintaan</Link>
      </div>
      {error && messages[error] && <p role="alert" className="copy-error">{messages[error]}</p>}
      <SectionLinks links={[["alokasi", "Alokasi stok"], ["penawaran", "Penawaran vendor"], ["purchase-order", "Purchase order"]]} />
      <section className="setup-panel mb-6" id="alokasi" tabIndex={-1}>
        <h2>Alokasi dan serah terima</h2>
        <p>Jumlah di luar alokasi internal {remaining} {pr.data.item_unit}</p>
        {!pr.data.product_id && <p>Alokasi stok internal tersedia untuk PR yang memakai produk katalog.</p>}
        <ul className="module-list">
          {reservations.data.map((row) => (
            <li key={row.id} className="flex-wrap justify-between">
              <span>{warehouses.data.find((warehouse) => warehouse.id === row.warehouse_id)?.name ?? "Gudang nonaktif"}
                {" · "}{row.receipt_id ? "Penerimaan PO" : "Stok internal"} · {row.quantity} dialokasikan, {row.remaining} belum diserahkan</span>
              {!activeOrder && !row.receipt_id && row.remaining === row.quantity && <form action={manageReservation}>
                <input type="hidden" name="request" value={id} />
                <input type="hidden" name="id" value={row.id} />
                <button className="button" name="action" value="cancel">Lepas alokasi</button>
              </form>}
            </li>
          ))}
        </ul>
        {pr.data.product_id && remaining > 0 && !activeOrder && sourceWarehouses.length === 0 && (
          <p>Belum ada stok tersedia untuk produk ini.</p>
        )}
        {pr.data.product_id && remaining > 0 && !activeOrder && sourceWarehouses.length > 0 && (
          <form action={manageReservation} className="request-form">
            <input type="hidden" name="request" value={id} />
            <input type="hidden" name="id" value={randomUUID()} />
            <label>Gudang sumber<select name="warehouse" required defaultValue="">
              <option value="" disabled>Pilih gudang</option>
              {sourceWarehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>{warehouse.name} · {availableByWarehouse.get(warehouse.id)} tersedia</option>
              ))}
            </select></label>
            <label>Jumlah<input name="quantity" type="number" min={1} max={remaining} required /></label>
            <button className="button button-primary" name="action" value="reserve">Alokasikan stok</button>
          </form>
        )}
      </section>
      <div className="setup-grid">
        <section className="setup-panel" id="penawaran" tabIndex={-1}>
          <h2>Penawaran vendor</h2>
          {quotations.data.length === 0 && <p>Belum ada penawaran.</p>}
          <ul className="module-list">
            {quotations.data.map((quote) => (
              <li key={quote.id}><div className="min-w-0 w-full">
                <h3 className="wrap-anywhere">{quote.vendor_name}</h3>
                <p>{money.format(quote.unit_price)} per satuan · Berlaku sampai {quote.valid_until}</p>
                {quote.note && <p className="wrap-anywhere">{quote.note}</p>}
                {!activeOrder && remaining > 0 && quote.valid_until >= today && (
                  <form action={createPurchaseOrder}>
                    <input type="hidden" name="request" value={id} />
                    <input type="hidden" name="quotation" value={quote.id} />
                    <button className="button">Buat draft PO</button>
                  </form>
                )}
              </div></li>
            ))}
          </ul>
        </section>
        <section className="setup-panel">
          <h2>Catat penawaran</h2>
          {vendors.data.length === 0 ? <Link className="inline-link" href="/pengadaan/vendor">Tambahkan vendor aktif</Link> : (
            <form action={recordQuotation} className="request-form">
              <input type="hidden" name="id" value={randomUUID()} />
              <input type="hidden" name="request" value={id} />
              <label>Vendor<select name="vendor" required defaultValue="">
                <option value="" disabled>Pilih vendor</option>
                {vendors.data.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.code} · {vendor.name}</option>)}
              </select></label>
              <label>Harga satuan (IDR)<input name="price" inputMode="decimal" type="number" step="0.01" min="0.01" required /></label>
              <label>Berlaku sampai<input name="valid" type="date" min={today} required /></label>
              <label>Catatan<textarea name="note" rows={2} maxLength={500} /></label>
              <button className="button button-primary">Simpan penawaran</button>
            </form>
          )}
        </section>
      </div>
      <section className="setup-panel mt-6" id="purchase-order" tabIndex={-1}>
        <h2>Purchase order</h2>
        {orders.data.length === 0 && <p>Belum ada PO.</p>}
        <ul className="module-list">
          {orders.data.map((order) => (
            <li key={order.id}><div className="min-w-0 w-full">
              <h3>PO-{order.number} · {statuses[order.status]}</h3>
              <p className="wrap-anywhere">{order.vendor_name} · {order.quantity} × {money.format(order.unit_price)} · Total {money.format(order.total)}</p>
              {order.cancellation_reason && <p className="wrap-anywhere">{order.cancellation_reason}</p>}
              {order.warehouse_id && <p>Gudang tujuan · {warehouses.data.find((warehouse) => warehouse.id === order.warehouse_id)?.name ?? "Gudang nonaktif"}</p>}
              <Link className="inline-link" href={`/pengadaan/po/${order.id}`}>Buka dokumen PO</Link>
              {order.status === "draft" && (warehouses.data.length === 0
                ? <Link className="inline-link" href="/gudang">Tambahkan gudang tujuan</Link>
                : <form action={transitionPurchaseOrder} className="request-form">
                <input type="hidden" name="request" value={id} /><input type="hidden" name="order" value={order.id} />
                <label>Gudang tujuan<select name="warehouse" required defaultValue="">
                  <option value="" disabled>Pilih gudang</option>
                  {warehouses.data.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.code} · {warehouse.name}</option>)}
                </select></label>
                {!order.product_id && (
                  <label>Produk untuk stok<select name="product" required defaultValue="">
                    <option value="" disabled>Pilih produk yang cocok</option>
                    {products.data.map((product) => <option key={product.id} value={product.id}>{product.sku} · {product.name}</option>)}
                  </select></label>
                )}
                <button className="button button-primary" name="action" value="send">Tandai sudah dikirim</button>
              </form>)}
              {["draft", "sent"].includes(order.status) && <details>
                <summary className="inline-link cursor-pointer">Batalkan PO</summary>
                <form action={transitionPurchaseOrder} className="request-form">
                  <input type="hidden" name="request" value={id} /><input type="hidden" name="order" value={order.id} />
                  <label>Alasan<textarea name="reason" required maxLength={500} /></label>
                  <button className="button copy-error" name="action" value="cancel">Konfirmasi pembatalan</button>
                </form>
              </details>}
            </div></li>
          ))}
        </ul>
      </section>
    </WorkspaceShell>
  );
}
