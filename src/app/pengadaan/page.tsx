import Link from "next/link";
import { WorkspaceShell } from "@/components/workspace-shell";
import { ProcurementPagination } from "@/features/procurement/pagination";
import { procurementPage, requireProcurementSession } from "@/features/procurement/session";

const dateFormat = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "UTC" });

export default async function ProcurementPage({ searchParams }: {
  searchParams: Promise<{ halaman?: string }>;
}) {
  const { halaman } = await searchParams;
  const page = procurementPage(halaman);
  const start = (page - 1) * 25;
  const supabase = await requireProcurementSession();
  const { data, error } = await supabase.from("purchase_requests")
    .select("id, number, item_name, item_sku, item_unit, quantity, need_by")
    .eq("status", "approved").order("need_by").order("number").range(start, start + 25);

  return (
    <WorkspaceShell current="procurement">
      <div className="page-heading flex flex-wrap items-center justify-between gap-3">
        <div><h1>Antrean pengadaan</h1><p>Permintaan yang sudah disetujui, diurutkan menurut tanggal kebutuhan.</p></div>
        <Link className="button button-primary" href="/pengadaan/vendor">Kelola vendor</Link>
      </div>
      <section className="setup-panel">
        {error ? <p role="alert">Antrean gagal dimuat. Muat ulang halaman untuk mencoba lagi.</p>
          : !data?.length ? <p>Belum ada permintaan yang disetujui pada halaman ini.</p>
          : <ul className="module-list">
            {data.slice(0, 25).map((request) => (
              <li key={request.id} className="justify-between flex-wrap gap-y-1">
                <div className="min-w-0">
                  <Link className="inline-link wrap-anywhere" href={`/permintaan/${request.id}`}>PR-{request.number} · {request.item_name}</Link>
                  <p>{request.item_sku && <>{request.item_sku} · </>}{request.quantity} {request.item_unit}</p>
                </div>
                <time dateTime={request.need_by}>{dateFormat.format(new Date(request.need_by))}</time>
              </li>
            ))}
          </ul>}
        <ProcurementPagination page={page} hasNext={(data?.length ?? 0) > 25} href={(target) => `/pengadaan?halaman=${target}`} />
      </section>
    </WorkspaceShell>
  );
}
