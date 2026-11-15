import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight, Database, Package, Truck,
} from "@phosphor-icons/react/dist/ssr";
import { ConfigurationStatus } from "@/components/configuration-status";
import { WorkspaceShell } from "@/components/workspace-shell";
import { readSupabaseConfig } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

const modules = [
  { icon: Truck, name: "Pengadaan", detail: "Vendor, quotation, dan purchase order." },
  { icon: Package, name: "Persediaan", detail: "Penerimaan, pengeluaran, dan transfer stok." },
];

export default function OverviewPage() {
  const { config, fields } = readSupabaseConfig(process.env);
  if (process.env.VERCEL_ENV) redirect(config ? "/dashboard" : "/masuk");

  return (
    <WorkspaceShell current="overview">
      <div className="page-heading">
        <h1>Ringkasan workspace</h1>
        <p>Pengadaan dan persediaan perusahaan dalam satu ruang kerja.</p>
      </div>

      <section className="readiness" aria-labelledby="readiness-heading">
        <div className="readiness-main">
          <div className="section-icon"><Database size={23} aria-hidden /></div>
          <div>
            <h2 id="readiness-heading">{config ? "Permintaan pembelian" : "Siapkan koneksi Supabase"}</h2>
            <p>{config
              ? "Buat draft, ajukan kebutuhan, dan lihat keputusan manager."
              : "Isi URL proyek dan kunci publik untuk menyiapkan workspace bagi integrasi database."}</p>
            <Link className="button button-primary" href={config ? "/permintaan" : "/konfigurasi"}>
              {config ? "Buka permintaan" : "Buka Konfigurasi"} <ArrowRight size={17} aria-hidden />
            </Link>
          </div>
        </div>
        <div className="readiness-checks">
          <p className="checklist-title">Status konfigurasi</p>
          <ConfigurationStatus fields={fields} />
        </div>
      </section>

      <section className="module-section" aria-labelledby="module-heading">
        <div className="section-heading">
          <h2 id="module-heading">Modul operasional</h2>
          <span className="badge">Dalam rencana</span>
        </div>
        <ul className="module-list">
          {modules.map(({ icon: Icon, name, detail }) => (
            <li key={name}>
              <span className="module-icon"><Icon size={21} aria-hidden /></span>
              <div><h3>{name}</h3><p>{detail}</p></div>
            </li>
          ))}
        </ul>
      </section>
    </WorkspaceShell>
  );
}
