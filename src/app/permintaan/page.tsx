import Link from "next/link";
import { WorkspaceShell } from "@/components/workspace-shell";
import { approveOpkbRequests, signOut } from "@/features/requests/actions";
import { RequestForm } from "@/features/requests/request-form";
import { requireRequestSession, statusLabel } from "@/features/requests/session";

export default async function RequestsPage({ searchParams }: {
  searchParams: Promise<{ error?: string; halaman?: string; opkb?: string; tersimpan?: string; disetujui?: string }>;
}) {
  const { error, halaman, opkb, tersimpan, disetujui } = await searchParams;
  const reference = typeof opkb === "string" && opkb.length <= 80 ? opkb.trim() : "";
  const page = /^[1-9]\d{0,4}$/.test(halaman ?? "") ? Number(halaman) : 1;
  const start = (page - 1) * 25;
  const { supabase, profile, profileError } = await requireRequestSession();
  const query = supabase.from("purchase_requests").select("id, number, item_name, status, opkb_number, approver_id, version, quantity, item_unit, requested_unit, purpose");
  const requests = profile && await (reference ? query.eq("opkb_number", reference) : query)
    .order("created_at", { ascending: false }).order("id").range(start, start + 25);
  const pageLink = (target: number) => `/permintaan?${new URLSearchParams({
    halaman: String(target), ...(reference ? { opkb: reference } : {}),
  })}`;
  const rows = requests && requests.data?.slice(0, 25);
  const canApprove = Boolean(reference && profile?.role === "manager"
    && rows && rows.some((row) => row.status === "pending_approval" && row.approver_id === profile.id));
  const messages: Record<string, string> = {
    logout: "Tidak bisa keluar. Coba lagi.",
    approval: "Persetujuan gagal. Periksa status dan penugasan PR, lalu coba lagi.",
    "approval-selection": "Pilih minimal satu PR yang menunggu persetujuan Anda.",
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
        <p role="status">{tersimpan} draft disimpan. Buka tiap draft untuk mengajukannya.</p>}
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
              : <form action={canApprove ? approveOpkbRequests : undefined}>
                <input type="hidden" name="reference" value={reference} />
                <ul className="module-list">
                {rows.map((request) => (
                  <li key={request.id}><div className="min-w-0">
                    {canApprove && request.status === "pending_approval" && request.approver_id === profile.id &&
                      <label className="flex min-h-11 items-center gap-2">
                        <input type="checkbox" name="selected" value={`${request.id}:${request.version}`} />
                        Pilih PR-{request.number}
                      </label>}
                    <Link className="inline-link flex-wrap" href={`/permintaan/${request.id}`}>
                      PR-{request.number}{request.opkb_number && ` · ${request.opkb_number}`} · {request.item_name} <span className="badge">{statusLabel[request.status]}</span>
                    </Link>
                    {canApprove && <p className="wrap-anywhere">{request.quantity} {request.item_unit ?? request.requested_unit} · {request.purpose}</p>}
                  </div></li>
                ))}
                </ul>
                {canApprove && <button type="submit" className="button button-primary my-3">Setujui PR yang dipilih</button>}
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
