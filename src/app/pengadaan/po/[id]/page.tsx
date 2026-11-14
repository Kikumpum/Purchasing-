import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { WorkspaceShell } from "@/components/workspace-shell";
import { requireProcurementSession } from "@/features/procurement/session";
import { PrintOrderButton } from "@/features/procurement/print-order-button";

const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" });
const date = new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" });
const statuses: Record<string, string> = {
  draft: "Draft", sent: "Terkirim", cancelled: "Dibatalkan", partial: "Diterima sebagian", received: "Diterima",
};

export default async function PurchaseOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await requireProcurementSession();
  const { data: order, error } = await supabase.from("purchase_orders")
    .select("number, request_id, vendor_name, item_name, item_sku, item_unit, quantity, unit_price, total, status, created_at, sent_at, warehouse_id")
    .eq("id", id).maybeSingle();
  if (error) throw new Error("PO gagal dimuat.");
  if (!order) notFound();
  const [request, warehouse] = await Promise.all([
    supabase.from("purchase_requests").select("number").eq("id", order.request_id).single(),
    order.warehouse_id
      ? supabase.from("warehouses").select("name").eq("id", order.warehouse_id).single()
      : null,
  ]);
  if (request.error || warehouse?.error) throw new Error("Referensi PO gagal dimuat.");

  return (
    <WorkspaceShell current="procurement">
      <div className="page-heading flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link className="inline-link" href={`/pengadaan/${order.request_id}`}>Kembali ke pengadaan</Link>
        <PrintOrderButton />
      </div>
      <article className="setup-panel">
        <div className="page-heading">
          <h1>Purchase order PO-{order.number}</h1>
          <p>{statuses[order.status]} · {date.format(new Date(order.created_at))}</p>
        </div>
        <dl className="request-form">
          <div><dt>Vendor</dt><dd>{order.vendor_name}</dd></div>
          <div><dt>Permintaan</dt><dd>PR-{request.data.number}</dd></div>
          {warehouse?.data && <div><dt>Gudang tujuan</dt><dd>{warehouse.data.name}</dd></div>}
          {order.sent_at && <div><dt>Tanggal dikirim</dt><dd>{date.format(new Date(order.sent_at))}</dd></div>}
          <div><dt>Barang</dt><dd>{order.item_name}{order.item_sku && ` · ${order.item_sku}`}</dd></div>
          <div><dt>Jumlah</dt><dd>{order.quantity} {order.item_unit}</dd></div>
          <div><dt>Harga satuan</dt><dd>{money.format(order.unit_price)}</dd></div>
          <div><dt>Total</dt><dd><strong>{money.format(order.total)}</strong></dd></div>
        </dl>
      </article>
    </WorkspaceShell>
  );
}
