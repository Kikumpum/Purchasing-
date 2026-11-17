import Link from "next/link";
import { WorkspaceShell } from "@/components/workspace-shell";
import { ProcurementPagination } from "@/features/procurement/pagination";
import { procurementPage, requireProcurementSession } from "@/features/procurement/session";

const dateFormat = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "UTC" });
const orderLabel: Record<string, string> = {
  draft: "Draft PO", sent: "PO dikirim", partial: "Diterima sebagian", received: "Diterima lengkap",
};

export default async function ProcurementPage({ searchParams }: {
  searchParams: Promise<{ halaman?: string; error?: string; q?: string; opkb?: string }>;
}) {
  const { halaman, error: formError, q, opkb } = await searchParams;
  const term = typeof q === "string" ? q.trim().slice(0, 80) : "";
  const reference = typeof opkb === "string" ? opkb.trim().slice(0, 80) : "";
  const page = procurementPage(halaman);
  const start = (page - 1) * 25;
  const supabase = await requireProcurementSession();
  let query = supabase.from("purchase_requests")
    .select("id, number, item_name, item_sku, item_unit, requested_unit, quantity, need_by, opkb_number, purchase_orders(number,status)")
    .eq("status", "approved").order("need_by").order("number").range(start, start + 25);
  if (term) query = query.ilike("item_name", `%${term.replace(/[\\%_]/g, "\\$&")}%`);
  if (reference) query = query.eq("opkb_number", reference);
  const { data, error } = await query;
  const pageLink = (target: number) => `/pengadaan?${new URLSearchParams({
    ...(term ? { q: term } : {}), ...(reference ? { opkb: reference } : {}), halaman: String(target),
  })}`;

  return (
    <WorkspaceShell current="procurement">
      <div className="page-heading flex flex-wrap items-center justify-between gap-3">
        <div><h1>Antrean pengadaan</h1><p>Permintaan yang sudah disetujui, diurutkan menurut tanggal kebutuhan.</p></div>
        <Link className="button button-primary" href="/pengadaan/vendor">Kelola vendor</Link>
      </div>
      <section className="setup-panel">
        <form action="/pengadaan" method="get" className="request-form">
          <div className="flex flex-wrap items-end gap-3">
            <label>Nama barang<input name="q" type="search" maxLength={80} defaultValue={term} /></label>
            <label>Nomor OPKB<input name="opkb" type="search" maxLength={80} defaultValue={reference} /></label>
            <button type="submit" className="button">Cari</button>
            {(term || reference) && <Link className="inline-link self-center" href="/pengadaan">Hapus filter</Link>}
          </div>
        </form>
        {formError === "input" && <p role="alert" className="copy-error">Isian formulir belum valid. Buka kembali permintaan dan periksa isian.</p>}
        {error ? <p role="alert">Antrean gagal dimuat. Muat ulang halaman untuk mencoba lagi.</p>
          : !data?.length ? <p>{term || reference ? "Tidak ada permintaan yang cocok dengan filter." : "Belum ada permintaan yang disetujui pada halaman ini."}</p>
          : <div className="dashboard-table" role="region" aria-label="Antrean pengadaan" tabIndex={0}>
            <table>
              <thead><tr><th scope="col">PR dan barang</th><th scope="col">Jumlah diminta</th><th scope="col">Tanggal kebutuhan</th><th scope="col">Status PO</th></tr></thead>
              <tbody>{data.slice(0, 25).map((request) => {
                const order = request.purchase_orders.find((entry) => entry.status !== "cancelled");
                return <tr key={request.id}>
                  <td className="wrap-anywhere">
                    <Link className="inline-link" href={`/pengadaan/${request.id}`}>PR-{request.number}</Link>
                    <p>{request.item_name}</p>
                    {request.item_sku && <p className="text-sm text-muted">SKU {request.item_sku}</p>}
                    {request.opkb_number && <p className="text-sm text-muted">{request.opkb_number}</p>}
                  </td>
                  <td className="tabular-nums">{request.quantity} {request.item_unit ?? request.requested_unit}</td>
                  <td><time dateTime={request.need_by}>{dateFormat.format(new Date(request.need_by))}</time></td>
                  <td>{order ? <><span className="badge">{orderLabel[order.status] ?? order.status}</span><p>PO-{order.number}</p></> : "Belum ada PO aktif"}</td>
                </tr>;
              })}</tbody>
            </table>
          </div>}
        <ProcurementPagination page={page} hasNext={(data?.length ?? 0) > 25} href={pageLink} />
      </section>
    </WorkspaceShell>
  );
}
