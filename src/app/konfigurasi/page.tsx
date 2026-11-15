import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowUpRight, Database } from "lucide-react";
import { ConfigurationStatus } from "@/components/configuration-status";
import { WorkspaceShell } from "@/components/workspace-shell";
import { CopyTemplate } from "@/features/setup/copy-template";
import { localEnvTemplate, readSupabaseConfig } from "@/lib/supabase/config";
import { checkSupabaseConnection } from "@/lib/supabase/check-connection";

export const metadata: Metadata = { title: "Konfigurasi" };
export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if (process.env.VERCEL_ENV) redirect("/dashboard");
  const { config, fields } = readSupabaseConfig(process.env);
  const connection = config && await checkSupabaseConnection(config);

  return (
    <WorkspaceShell current="setup">
      <div className="page-heading">
        <h1>Konfigurasi</h1>
        <p>Atur koneksi Supabase untuk workspace lokal.</p>
      </div>
      <div className="setup-grid">
        <section className="setup-panel" aria-labelledby="setup-heading">
          <h2 id="setup-heading">Hubungkan proyek Supabase</h2>
          <ol className="setup-steps">
            <li>Ambil URL proyek dan kunci publishable dari dashboard Supabase.</li>
            <li>
              Buat file <code>.env.local</code> di folder proyek, lalu isi dua variabel berikut.
              <div className="code-panel">
                <div className="code-toolbar"><span>.env.local</span><CopyTemplate value={localEnvTemplate} /></div>
                <pre><code>{localEnvTemplate}</code></pre>
              </div>
            </li>
            <li>Mulai ulang server Next.js, lalu muat ulang halaman ini.</li>
          </ol>
          <a className="inline-link" href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">
            Buka dashboard Supabase <ArrowUpRight size={16} aria-hidden />
          </a>
        </section>
        <section className="setup-panel setup-status" aria-labelledby="status-heading">
          <div className="section-icon"><Database size={23} aria-hidden /></div>
          <h2 id="status-heading">Status konfigurasi</h2>
          <ConfigurationStatus fields={fields} />
          <p className="setup-note">{config
            ? connection
              ? "Supabase Auth terhubung dan merespons."
              : "Supabase Auth tidak merespons. Muat ulang halaman atau hubungi pengelola Purchasing."
            : "Koneksi Supabase Auth diperiksa setelah URL dan kunci publik tersedia."}</p>
        </section>
      </div>
    </WorkspaceShell>
  );
}
