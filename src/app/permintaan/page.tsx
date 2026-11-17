import Link from "next/link";
import { WorkspaceShell } from "@/components/workspace-shell";
import { updateOpkbRequests, signOut } from "@/features/requests/actions";
import { RequestForm } from "@/features/requests/request-form";
import { requireRequestSession, statusLabel } from "@/features/requests/session";

export default async function RequestsPage({ searchParams }: {
  searchParams: Promise<{ error?: string; halaman?: string; opkb?: string; tersimpan?: string; disetujui?: string; diajukan?: string }>;
}) {
  const { error, halaman, opkb, tersimpan, disetujui, diajukan } = await searchParams;
  const reference = typeof opkb === "string" && opkb.length <= 80 ? opkb.trim() : "";
  const page = /^[1-9]\d{0,4}$/.test(halaman ?? "") ? Number(halaman) : 1;
  const start = (page - 1) * 25;
  const { supabase, profile, profileError } = await requireRequestSession();
  const query = supabase.from("purchase_requests").select("id, number, item_name, status, opkb_number, requester_id, approver_id, version, quantity, item_unit, requested_unit, purpose");
  const requests = profile && await (reference ? query.eq("opkb_number", reference) : query)
    .order("created_at", { ascending: false }).order("id").range(start, start + 25);
  const pageLink = (target: number) => `/permintaan?${new URLSearchParams({
    halaman: String(target), ...(reference ? { opkb: reference } : {}),
  })}`;
  const rows = requests && requests.data?.slice(0, 25);
  function canSelect(row: NonNullable<typeof rows>[number]) {
    if (!reference || !profile) return false;
    if (profile.role === "employee") {
      return row.requester_id === profile.id && ["draft", "revision_requested"].includes(row.status);
    }
    return profile.role === "manager" && row.status === "pending_approval" && row.approver_id === profile.id;
  }
  const canSelectRows = rows && rows.some(canSelect);
  const employee = profile?.role === "employee";
  const messages: Record<string, string> = {
    submit: "Pengajuan gagal. Periksa status PR, lalu coba lagi.",
    approver: "Departemen Anda belum memiliki manager aktif.",
    logout: "Tidak bisa keluar. Coba lagi.",
    approval: "Persetujuan gagal. Periksa status dan penugasan PR, lalu coba lagi.",
    "approval-selection": "Pilih minimal satu PR yang bisa diproses.",
  };

  return (
    <WorkspaceShell current="requests" canProcure={profile?.role === "admin_procurement"}
      canWarehouse={profile?.role === "warehouse" || profile?.role === "admin_procurement"}>
      <div className="page-heading flex flex-wrap items-start justify-between gap-3">
        <div><h1>Permintaan pembelian</h1>{profile && <p>{profile.display_name}</p>}</div>
        <form action={signOut}><button className="button" type="submit">Keluar</button></form>
      </div>
      {error && <p role="alert" className="copy-error">{messages[error] ?? "Permintaan tidak dapat disimpan. Periksa isian lalu coba lagi."}</p>}
      {reference && profile?.role === "manager" && /^(?:[1-9]|1\d|2[0-5])$/.test(disetujui ?? "") &&
        <p role="status">{disetujui} PR disetujui.</p>}
      {reference && profile?.role === "employee" && /^(?:[2-9]|[12]\d|30)$/.test(tersimpan ?? "") &&
        <p role="status">{tersimpan} draft disimpan. Pilih draft yang siap diajukan.</p>}
      {reference && employee && /^(?:[1-9]|1\d|2[0-5])$/.test(diajukan ?? "") &&
        <p role="status">{diajukan} PR diajukan ke Manager.</p>}
      {!profile && <p role="status">{profileError ? "Data profil belum tersedia. Hubungi pengelola Purchasing." : "Akun Anda belum memiliki profil aktif. Hubungi pengelola Purchasing."}</p>}
      {profile && (
        <div className={profile.role === "employee" ? "setup-grid" : undefined}>
          <section className="setup-panel">
            <h2>Daftar permintaan</h2>
            <form className="request-form" action="/permintaan">
              <label>Filter nomor OPKB<input name="opkb" defaultValue={reference} maxLength={80} /></label>
              <div className="flex flex-wrap items-center gap-3">
                <button className="button" type="submit">Cari OPKB</button>
                {reference && <Link className="inline-link" href="/permintaan">Hapus filter</Link>}
              </div>
            </form>
            {requests?.error ? <p role="alert">Daftar gagal dimuat. Muat ulang halaman untuk mencoba lagi.</p>
              : !rows || !rows.length ? <p>Belum ada permintaan pada halaman ini.</p>
              : <form action={canSelectRows ? updateOpkbRequests : undefined}>
                <input type="hidden" name="operation" value={employee ? "submit" : "approve"} />
                <input type="hidden" name="reference" value={reference} />
                <div className="dashboard-table" role="region" aria-label="Daftar permintaan pembelian" tabIndex={0}>
                <table>
                <thead><tr>{canSelectRows && <th scope="col">Pilih</th>}<th scope="col">PR dan barang</th><th scope="col">Jumlah</th><th scope="col">Status</th></tr></thead>
                <tbody>
                {rows.map((request) => (
                  <tr key={request.id}>
                    {canSelectRows && <td>{canSelect(request) && <label className="flex min-h-11 min-w-11 items-center justify-center">
                      <input type="checkbox" aria-label={`Pilih PR-${request.number}`} name="selected" value={`${request.id}:${request.version}`} />
                    </label>}</td>}
                    <td className="wrap-anywhere">
                      <Link className="inline-link" href={`/permintaan/${request.id}`}>PR-{request.number}</Link>
                      <p>{request.item_name}</p>
                      {request.opkb_number && <p className="text-sm text-muted">{request.opkb_number}</p>}
                      {canSelectRows && <p className="text-sm">{request.purpose}</p>}
                    </td>
                    <td className="tabular-nums">{request.quantity} {request.item_unit ?? request.requested_unit}</td>
                    <td><span className="badge">{statusLabel[request.status]}</span></td>
                  </tr>
                ))}
                </tbody>
                </table>
                </div>
                {canSelectRows && <button type="submit" className="button button-primary my-3">{employee ? "Ajukan PR yang dipilih" : "Setujui PR yang dipilih"}</button>}
              </form>}
            <nav className="flex flex-wrap gap-4" aria-label="Halaman permintaan">
              {page > 1 && <Link className="inline-link" href={pageLink(page - 1)}>Sebelumnya</Link>}
              {(requests?.data?.length ?? 0) > 25 && <Link className="inline-link" href={pageLink(page + 1)}>Berikutnya</Link>}
            </nav>
          </section>
          {profile.role === "employee" && <section className="setup-panel"><h2>Buat permintaan</h2><RequestForm /></section>}
        </div>
      )}
    </WorkspaceShell>
  );
}
