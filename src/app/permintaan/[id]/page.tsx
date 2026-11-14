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

export default async function RequestPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { error } = await searchParams;
  const { supabase, profile } = await requireRequestSession();
  const { data: request, error: loadError } = await supabase.from("purchase_requests")
    .select("id, number, version, requester_id, approver_id, item_name, item_sku, item_unit, product_id, quantity, purpose, need_by, status")
    .eq("id", id).maybeSingle();
  if (loadError) throw new Error("Permintaan gagal dimuat.");
  if (!request || !profile) notFound();
  const history = await supabase.from("purchase_request_status_history")
    .select("id, status, note, created_at").eq("request_id", id).order("id", { ascending: false });
  const canEdit = profile.role === "employee" && request.requester_id === profile.id &&
    ["draft", "revision_requested"].includes(request.status);
  const canDecide = profile.role === "manager" && request.approver_id === profile.id &&
    request.status === "pending_approval";

  return (
    <WorkspaceShell current="requests">
      <div className="page-heading">
        <Link className="inline-link" href="/permintaan">Kembali ke daftar</Link>
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
              <div><dt>Kuantitas</dt><dd>{request.quantity}</dd></div>
              <div><dt>Tanggal kebutuhan</dt><dd>{request.need_by}</dd></div>
              <div><dt>Tujuan</dt><dd className="whitespace-pre-wrap wrap-anywhere">{request.purpose}</dd></div>
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
                <p><time dateTime={entry.created_at}>{new Intl.DateTimeFormat("id-ID", {
                  dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta",
                }).format(new Date(entry.created_at))}</time></p>
                {entry.note && <p className="whitespace-pre-wrap wrap-anywhere">{entry.note}</p>}
              </div></li>
            ))}
          </ol>}
        </section>
      </div>
    </WorkspaceShell>
  );
}
