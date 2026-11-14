import Link from "next/link";
import { WorkspaceShell } from "@/components/workspace-shell";
import { saveVendor } from "@/features/procurement/actions";
import { ProcurementPagination } from "@/features/procurement/pagination";
import { procurementPage, requireProcurementSession } from "@/features/procurement/session";

type Vendor = {
  id: string; version: number; code: string; name: string;
  email: string; phone: string; address: string; active: boolean;
};

const messages: Record<string, string> = {
  input: "Periksa kode, nama, dan kontak vendor.",
  duplicate: "Kode vendor sudah digunakan.",
  save: "Vendor gagal disimpan. Muat ulang halaman untuk mendapatkan data terbaru.",
};

function VendorForm({ vendor }: { vendor?: Vendor }) {
  return (
    <form className="request-form" action={saveVendor}>
      {vendor && <>
        <input type="hidden" name="id" value={vendor.id} />
        <input type="hidden" name="version" value={vendor.version} />
      </>}
      <label>Kode vendor<input name="code" required maxLength={40} defaultValue={vendor?.code} /></label>
      <label>Nama vendor<input name="name" required maxLength={160} defaultValue={vendor?.name} /></label>
      <label>Email<input name="email" type="email" maxLength={254} defaultValue={vendor?.email} /></label>
      <label>Telepon<input name="phone" type="tel" maxLength={50} defaultValue={vendor?.phone} /></label>
      <label>Alamat<textarea name="address" maxLength={500} rows={2} defaultValue={vendor?.address} /></label>
      {vendor && <label className="catalog-toggle"><input type="checkbox" name="active" defaultChecked={vendor.active} /> Vendor aktif</label>}
      <button className="button button-primary">{vendor ? "Simpan perubahan" : "Tambah vendor"}</button>
    </form>
  );
}

export default async function VendorsPage({ searchParams }: {
  searchParams: Promise<{ q?: string; halaman?: string; error?: string; saved?: string }>;
}) {
  const { q, halaman, error, saved } = await searchParams;
  const term = typeof q === "string" ? q.trim().slice(0, 80) : "";
  const page = procurementPage(halaman);
  const start = (page - 1) * 25;
  const supabase = await requireProcurementSession();
  let query = supabase.from("vendors").select("id, version, code, name, email, phone, address, active")
    .order("code").range(start, start + 25);
  if (term) query = query.ilike("name", `%${term.replace(/[\\%_]/g, "\\$&")}%`);
  const { data, error: queryError } = await query;

  return (
    <WorkspaceShell current="procurement">
      <div className="page-heading">
        <Link className="inline-link" href="/pengadaan">Kembali ke antrean pengadaan</Link>
        <h1>Vendor</h1>
      </div>
      {error && messages[error] && <p role="alert" className="copy-error">{messages[error]}</p>}
      {saved === "1" && <p role="status">Vendor tersimpan.</p>}
      <div className="setup-grid">
        <section className="setup-panel">
          <form action="/pengadaan/vendor" method="get" className="request-form">
            <label>Cari nama vendor<input name="q" type="search" maxLength={80} defaultValue={term} /></label>
            <button className="button button-primary">Cari</button>
          </form>
          {queryError ? <p role="alert">Daftar vendor gagal dimuat.</p> :
            !data?.length ? <p>{term ? "Vendor yang dicari tidak ditemukan." : "Belum ada vendor."}</p> :
            <ul className="module-list">
              {data.slice(0, 25).map((vendor) => (
                <li key={vendor.id}>
                  <div className="min-w-0 w-full">
                    <h3 className="wrap-anywhere">{vendor.name}</h3>
                    <p>{vendor.code} · {vendor.active ? "Aktif" : "Nonaktif"}</p>
                    <details><summary className="inline-link cursor-pointer">Edit vendor</summary><VendorForm vendor={vendor} /></details>
                  </div>
                </li>
              ))}
            </ul>}
          <ProcurementPagination page={page} hasNext={(data?.length ?? 0) > 25}
            href={(target) => `/pengadaan/vendor?${new URLSearchParams({ q: term, halaman: String(target) })}`} />
        </section>
        <section className="setup-panel"><h2>Vendor baru</h2><VendorForm /></section>
      </div>
    </WorkspaceShell>
  );
}
