import Link from "next/link";
import { AccessShell } from "@/components/access-shell";
import { WarehouseAccountRequestForm } from "@/features/warehouse-account/request-form";
import { readSupabaseConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function canSubmitWarehouseRequest(): Promise<boolean> {
  const { config } = readSupabaseConfig(process.env);
  if (!config) return false;
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("warehouse_account_requests_available").abortSignal(AbortSignal.timeout(4000));
    return !error && data === true;
  } catch {
    return false;
  }
}

export default async function RegisterWarehousePage() {
  const canSubmit = await canSubmitWarehouseRequest();
  return (
    <AccessShell title="Ajukan akun Warehouse"
      description="Untuk petugas gudang. Pengelola akun akan memeriksa pengajuan dan menentukan gudang yang dapat Anda akses.">
      {canSubmit ? <WarehouseAccountRequestForm /> : (
        <p className="setup-panel" role="status">
          Pengajuan online belum tersedia. Hubungi pengelola akun Purchasing jika Anda memerlukan undangan Warehouse.
        </p>
      )}
      <Link className="inline-link" href="/masuk">Kembali ke halaman masuk</Link>
    </AccessShell>
  );
}
