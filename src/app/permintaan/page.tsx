import Link from "next/link";
import { WorkspaceShell } from "@/components/workspace-shell";
import { signOut } from "@/features/requests/actions";
import { RequestForm } from "@/features/requests/request-form";
import { requireRequestSession, statusLabel } from "@/features/requests/session";

export default async function RequestsPage({ searchParams }: {
  searchParams: Promise<{ error?: string; halaman?: string; opkb?: string; tersimpan?: string }>;
}) {
  const { error, halaman, opkb, tersimpan } = await searchParams;
  const reference = typeof opkb === "string" && opkb.length <= 80 ? opkb.trim() : "";
  const page = /^[1-9]\d{0,4}$/.test(halaman ?? "") ? Number(halaman) : 1;
  const start = (page - 1) * 25;
  const { supabase, profile, profileError } = await requireRequestSession();
  const query = supabase.from("purchase_requests").select("id, number, item_name, status, opkb_number");
  const requests = profile && await (reference ? query.eq("opkb_number", reference) : query)
    .order("created_at", { ascending: false }).order("id").range(start, start + 25);
  const pageLink = (target: number) => `/permintaan?${new URLSearchParams({
    halaman: String(target), ...(reference ? { opkb: reference } : {}),
  })}`;

  return (
    <WorkspaceShell current="requests" canProcure={profile?.role === "admin_procurement"}
      canWarehouse={profile?.role === "warehouse" || profile?.role === "admin_procurement"}>
      <div className="page-heading flex flex-wrap items-start justify-between gap-3">
        <div><h1>Permintaan pembelian</h1>{profile && <p>{profile.display_name}</p>}</div>
        <form action={signOut}><button className="button" type="submit">Keluar</button></form>
      </div>
      {error && <p role="alert" className="copy-error">{error === "logout" ? "Tidak bisa keluar. Coba lagi." : "Permintaan tidak dapat disimpan. Periksa isian lalu coba lagi."}</p>}
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
              : !requests?.data?.length ? <p>Belum ada permintaan pada halaman ini.</p>
              : <ul className="module-list">
                {requests.data.slice(0, 25).map((request) => (
                  <li key={request.id}>
                    <Link className="inline-link flex-wrap" href={`/permintaan/${request.id}`}>
                      PR-{request.number}{request.opkb_number && ` · ${request.opkb_number}`} · {request.item_name} <span className="badge">{statusLabel[request.status]}</span>
                    </Link>
                  </li>
                ))}
              </ul>}
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
