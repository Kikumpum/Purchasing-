import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PrintButton } from "@/components/print-button";
import { WorkspaceShell } from "@/components/workspace-shell";
import { loadHandovers, handoverDate } from "@/features/requests/handovers";
import { requireRequestSession } from "@/features/requests/session";

export default async function HandoverPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { supabase, profile } = await requireRequestSession();
  if (!profile) notFound();
  const { data: request, error } = await supabase.from("purchase_requests")
    .select("number, item_name, item_sku, item_unit, requested_unit, opkb_number")
    .eq("id", id).eq("status", "approved").maybeSingle();
  if (error) throw new Error("Referensi permintaan gagal dimuat.");
  if (!request) notFound();
  const events = await loadHandovers(supabase, id);
  if (!events) throw new Error("Riwayat serah terima gagal dimuat.");

  return (
    <WorkspaceShell current="requests" canProcure={profile.role === "admin_procurement"}>
      <div className="page-heading flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link className="inline-link" href={`/permintaan/${id}`}>Kembali ke detail PR</Link>
        {events.length > 0 && <PrintButton label="Cetak bukti" />}
      </div>
      <article className="setup-panel">
        <header className="page-heading">
          <h1>Bukti serah terima PR-{request.number}</h1>
          <p className="wrap-anywhere">{request.item_name}{request.item_sku && ` · SKU ${request.item_sku}`}</p>
          {request.opkb_number && <p className="wrap-anywhere">OPKB {request.opkb_number}</p>}
        </header>
        {events.length === 0 ? <p>Belum ada barang yang diserahkan.</p> : <>
          {events.length === 50 && <p>Dokumen ini memuat 50 transaksi terbaru.</p>}
          <ol className="module-list tabular-nums">
            {events.map((event) => (
              <li key={event.id} className="break-inside-avoid">
                <div className="min-w-0 wrap-anywhere">
                  <h2>{event.quantity} {request.item_unit ?? request.requested_unit} · {event.warehouse_name}</h2>
                  <p><time dateTime={event.created_at}>{handoverDate.format(new Date(event.created_at))} WIB</time></p>
                  <p>Penerima {event.recipient ?? "belum tercatat"}</p>
                  {event.shipping_reference && <p>Referensi pengiriman {event.shipping_reference}</p>}
                  <p>ID transaksi {event.id}</p>
                </div>
              </li>
            ))}
          </ol>
        </>}
      </article>
    </WorkspaceShell>
  );
}
