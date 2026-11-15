import { AccessShell } from "@/components/access-shell";
import { readSupabaseConfig } from "@/lib/supabase/config";
import { ActivateAccount } from "./activate-account";

export const dynamic = "force-dynamic";

export default function ActivatePage() {
  const { config } = readSupabaseConfig(process.env);
  return (
    <AccessShell title="Atur kata sandi Purchasing">
        {config ? <ActivateAccount config={config} /> : <p>Konfigurasi Supabase belum tersedia.</p>}
    </AccessShell>
  );
}
