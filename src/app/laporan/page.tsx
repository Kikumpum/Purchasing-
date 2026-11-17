import Link from "next/link";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { requireRequestSession } from "@/features/requests/session";
import { loadOperationalSummary, parseReportPeriod } from "@/features/reports/summary";

export default async function ReportsPage({ searchParams }: {
  searchParams: Promise<{ dari?: string; sampai?: string }>;
}) {
  const { dari, sampai } = await searchParams;
  const { profile, supabase } = await requireRequestSession();
  if (!profile) redirect("/permintaan");
  const canProcure = profile.role === "admin_procurement";
  const canWarehouse = profile.role === "warehouse" || canProcure;
  const period = parseReportPeriod(dari, sampai);
  const metrics = period.success ? await loadOperationalSummary(supabase, profile.role, period.data) : [];
  const groups = Map.groupBy(metrics, (metric) => metric.category);
  const filters = new URLSearchParams();
  if (period.success && period.data.dari) filters.set("dari", period.data.dari);
  if (period.success && period.data.sampai) filters.set("sampai", period.data.sampai);

  return (
    <WorkspaceShell current="reports" canProcure={canProcure} canWarehouse={canWarehouse}>
      <div className="page-heading"><h1>Laporan operasional</h1></div>
      <section className="setup-panel mb-6">
        <form action="/laporan" method="get" className="request-form">
          <div className="flex flex-wrap gap-4">
            <label>Dari (WIB)<input name="dari" type="date" min="1900-01-01" max="9998-12-31" defaultValue={typeof dari === "string" ? dari : ""} /></label>
            <label>Sampai (WIB)<input name="sampai" type="date" min="1900-01-01" max="9998-12-31" defaultValue={typeof sampai === "string" ? sampai : ""} /></label>
          </div>
          <div className="flex flex-wrap gap-4">
            <button className="button button-primary">Terapkan periode</button>
            {period.success && metrics.every((metric) => metric.count !== null) &&
              <a className="inline-link" href={`/laporan/ekspor?${filters}`}>Unduh CSV</a>}
            {canWarehouse && <Link className="inline-link" href={`/laporan/pergerakan?${filters}`}>Lihat pergerakan stok</Link>}
          </div>
        </form>
        {!period.success && <p role="alert" className="copy-error">Periksa format tanggal dan urutan periode.</p>}
        <p>Periode memakai tanggal pembuatan PR dan PO, penerimaan, pergerakan, atau pencatatan opname. Status PR dan opname mengikuti status saat ini.</p>
      </section>
      <div className="setup-grid">
        {[...groups].map(([category, entries]) => (
          <section className="setup-panel" key={category}>
            <h2>{category}</h2>
            <dl className="checklist">{entries.map(({ label, count }) => (
              <div className="checklist-row" key={label}><dt>{label}</dt><dd>{count ?? "Gagal dimuat"}</dd></div>
            ))}</dl>
          </section>
        ))}
      </div>
    </WorkspaceShell>
  );
}
