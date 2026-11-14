import { WorkspaceShell } from "@/components/workspace-shell";
import { readSupabaseConfig } from "@/lib/supabase/config";
import { ActivateAccount } from "./activate-account";

export const dynamic = "force-dynamic";

export default function ActivatePage() {
  const { config } = readSupabaseConfig(process.env);
  return (
    <WorkspaceShell current="requests">
      <div className="page-heading"><h1>Atur kata sandi Purchasing</h1></div>
      <section className="setup-panel max-w-lg">
        {config ? <ActivateAccount config={config} /> : <p>Konfigurasi Supabase belum tersedia.</p>}
      </section>
    </WorkspaceShell>
  );
}
