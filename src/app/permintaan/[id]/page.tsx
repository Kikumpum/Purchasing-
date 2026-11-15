import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { WorkspaceShell } from "@/components/workspace-shell";
import { transitionRequest } from "@/features/requests/actions";
import { RequestForm } from "@/features/requests/request-form";
import { requireRequestSession, statusLabel } from "@/features/requests/session";

const errors: Record<string, string> = {
  note: "Isi alasan penolakan atau catatan revisi.",
  approver: "Departemen Anda belum memiliki manager yang aktif.",
  conflict: "Permintaan berubah atau tindakan tidak diizinkan. Periksa status sebelum mencoba lagi.",
};

const orderStatus: Record<string, string> = {
  draft: "Draft PO",
  sent: "PO dikirim ke vendor",
  partial: "Diterima sebagian",
  received: "Diterima lengkap",
};

const eventDate = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta",
});

type Handover = {
  id: string;
  quantity: number;
  created_at: string;
  warehouse_name: string;
  recipient: string | null;
  shipping_reference: string | null;
};

export default async function RequestPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { error } = await searchParams;
  const { supabase, profile } = await requireRequestSession();
  const { data: request, error: loadError } = await supabase.from("purchase_requests")
    .select("id, number, version, requester_id, approver_id, item_name, item_sku, item_unit, product_id, quantity, purpose, need_by, status, opkb_number, opkb_date, requested_unit, request_note")
    .eq("id", id).maybeSingle();
  if (loadError) throw new Error("Permintaan gagal dimuat.");
  if (!request || !profile) notFound();
  const [history, fulfillment, handovers] = await Promise.all([
    supabase.from("purchase_request_status_history")
      .select("id, status, note, created_at").eq("request_id", id).order("id", { ascending: false }),
    request.status === "approved" ? supabase.rpc("request_delivery_progress", { p_id: id }).maybeSingle<{
      issued: number; awaiting_handover: number;
      po_number: number | null; po_status: string | null; ordered: number | null; received: number;
      vendor_name: string | null; warehouse_name: string | null;
    }>() : null,
    request.status === "approved" ? supabase.rpc("request_handover_history", { p_id: id }) : null,
  ]);
  const events: Handover[] | null = Array.isArray(handovers?.data) ? handovers.data : null;
  const canEdit = profile.role === "employee" && request.requester_id === profile.id &&
    ["draft", "revision_requested"].includes(request.status);
  const canDecide = profile.role === "manager" && request.approver_id === profile.id &&
    request.status === "pending_approval";

  return (
    <WorkspaceShell current="requests" canProcure={profile.role === "admin_procurement"}>
      <div className="page-heading">
        <Link className="inline-link" href="/permintaan">Kembali ke daftar</Link>
        {request.opkb_number && <Link className="inline-link ml-4" href={`/permintaan?${new URLSearchParams({ opkb: request.opkb_number })}`}>Barang dengan nomor OPKB ini</Link>}
        <h1>PR-{request.number} · {request.item_name}</h1>
        <p>{statusLabel[request.status]}</p>
        {request.item_sku && <p>SKU {request.item_sku} · {request.item_unit}</p>}
      </div>
      {error && errors[error] && <p role="alert" className="copy-error">{errors[error]}</p>}
      <div className="setup-grid">
        <section className="setup-panel">
          <h2>Detail kebutuhan</h2>
          {canEdit ? <RequestForm draft={request} /> : (
            <dl className="request-form">
              {request.opkb_number && <div><dt>Nomor OPKB</dt><dd className="wrap-anywhere">{request.opkb_number}</dd></div>}
              {request.opkb_date && <div><dt>Tanggal OPKB</dt><dd>{request.opkb_date}</dd></div>}
              <div><dt>Kuantitas</dt><dd>{request.quantity} {request.item_unit ?? request.requested_unit}</dd></div>
              <div><dt>Tanggal kebutuhan</dt><dd>{request.need_by}</dd></div>
              <div><dt>Kebutuhan</dt><dd className="whitespace-pre-wrap wrap-anywhere">{request.purpose}</dd></div>
              {request.request_note && <div><dt>Keterangan</dt><dd className="whitespace-pre-wrap wrap-anywhere">{request.request_note}</dd></div>}
            </dl>
          )}
          {(canEdit || canDecide) && (
            <form action={transitionRequest} className="request-form border-t border-current/15 pt-4">
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="version" value={request.version} />
              {canDecide && <label>Catatan keputusan<textarea name="note" maxLength={500} rows={3} /></label>}
              <div className="flex flex-wrap gap-2">
                {canEdit ? <button className="button button-primary" name="action" value="submit">Ajukan draft tersimpan</button> : (
                  <>
                    <button className="button button-primary" name="action" value="approve">Setujui</button>
                    <button className="button" name="action" value="revise">Minta revisi</button>
                    <button className="button copy-error" name="action" value="reject">Tolak</button>
                  </>
                )}
              </div>
            </form>
          )}
        </section>
        <section className="setup-panel">
          <h2>Riwayat</h2>
          {history.error ? <p role="alert">Riwayat gagal dimuat.</p> : <ol className="module-list">
            {history.data?.map((entry) => (
              <li key={entry.id}><div className="min-w-0">
                <strong>{statusLabel[entry.status]}</strong>
                <p><time dateTime={entry.created_at}>{eventDate.format(new Date(entry.created_at))}</time></p>
                {entry.note && <p className="whitespace-pre-wrap wrap-anywhere">{entry.note}</p>}
              </div></li>
            ))}
          </ol>}
        </section>
        {fulfillment && <section className="setup-panel">
          <h2>Pelacakan barang</h2>
          {fulfillment.error ? <p role="alert">Pelacakan gagal dimuat. Muat ulang halaman untuk mencoba lagi.</p>
            : !fulfillment.data ? <p>Data pelacakan belum tersedia.</p>
            : <dl className="request-form tabular-nums">
              <div><dt>Purchase Order</dt><dd>{fulfillment.data.po_number
                ? `PO-${fulfillment.data.po_number} · ${orderStatus[fulfillment.data.po_status ?? ""] ?? "Status belum tersedia"}`
                : "Belum ada PO aktif"}</dd></div>
              {fulfillment.data.po_number && <>
                <div><dt>Vendor</dt><dd className="wrap-anywhere">{fulfillment.data.vendor_name}</dd></div>
                <div><dt>Gudang tujuan</dt><dd className="wrap-anywhere">{fulfillment.data.warehouse_name ?? "Belum ditetapkan"}</dd></div>
                <div><dt>Diterima dari vendor</dt><dd>{fulfillment.data.received} dari {fulfillment.data.ordered} {request.item_unit ?? request.requested_unit}</dd></div>
              </>}
              <div><dt>Siap diserahkan</dt><dd>{fulfillment.data.awaiting_handover} {request.item_unit ?? request.requested_unit}</dd></div>
              <div><dt>Sudah diserahkan</dt><dd>{fulfillment.data.issued} dari {request.quantity} {request.item_unit ?? request.requested_unit}</dd></div>
            </dl>}
        </section>}
        {handovers && <section className="setup-panel">
          <h2>Riwayat serah terima</h2>
          {handovers.error || !events ? <p role="alert">Riwayat serah terima gagal dimuat. Muat ulang halaman untuk mencoba lagi.</p>
            : !events.length ? <p>Belum ada barang yang diserahkan.</p>
            : <>
              {events.length === 50 && <p>Menampilkan 50 transaksi terbaru.</p>}
              <ol className="module-list">{events.map((entry) => (
                <li key={entry.id}><div className="min-w-0 break-words">
                  <strong>{entry.quantity} {request.item_unit ?? request.requested_unit} · {entry.warehouse_name}</strong>
                  <p><time dateTime={entry.created_at}>{eventDate.format(new Date(entry.created_at))}</time></p>
                  {entry.recipient && <p>Penerima {entry.recipient}</p>}
                  {entry.shipping_reference && <p>Referensi pengiriman {entry.shipping_reference}</p>}
                </div></li>
              ))}</ol>
            </>}
        </section>}
      </div>
    </WorkspaceShell>
  );
}
