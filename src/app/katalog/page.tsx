import Link from "next/link";
import { WorkspaceShell } from "@/components/workspace-shell";
import { saveProduct } from "@/features/catalog/actions";
import { requireRequestSession } from "@/features/requests/session";

type Product = { id: string; sku: string; name: string; unit: string; active: boolean; version: number };

const messages: Record<string, string> = {
  input: "Periksa kode, nama, dan satuan barang.",
  sku: "SKU sudah digunakan.",
  save: "Barang gagal disimpan atau telah diubah. Muat ulang halaman dan coba lagi.",
};

function ProductForm({ product }: { product?: Product }) {
  return (
    <form className="request-form" action={saveProduct}>
      {product && <>
        <input type="hidden" name="id" value={product.id} />
        <input type="hidden" name="version" value={product.version} />
      </>}
      <label>SKU<input name="sku" required maxLength={40} defaultValue={product?.sku} /></label>
      <label>Nama barang<input name="name" required maxLength={160} defaultValue={product?.name} /></label>
      <label>Satuan<input name="unit" required maxLength={30} defaultValue={product?.unit} /></label>
      {product && <label className="catalog-toggle"><input type="checkbox" name="active" defaultChecked={product.active} /> Barang aktif</label>}
      <button className="button button-primary">{product ? "Simpan perubahan" : "Tambah barang"}</button>
    </form>
  );
}

export default async function CatalogPage({ searchParams }: {
  searchParams: Promise<{ q?: string; halaman?: string; error?: string; saved?: string }>;
}) {
  const { q, halaman, error, saved } = await searchParams;
  const term = typeof q === "string" ? q.trim().slice(0, 80) : "";
  const page = /^[1-9]\d{0,4}$/.test(halaman ?? "") ? Number(halaman) : 1;
  const offset = (page - 1) * 25;
  const { supabase, profile } = await requireRequestSession();
  const canManage = profile?.role === "admin_procurement";
  let query = supabase.from("products").select("id, sku, name, unit, active, version")
    .order("sku").range(offset, offset + 25);
  if (term) query = query.ilike("name", `%${term.replace(/[\\%_]/g, "\\$&")}%`);
  const result = profile && await query;
  const pageHref = (target: number) => `/katalog?${new URLSearchParams({ q: term, halaman: String(target) })}`;

  return (
    <WorkspaceShell current="catalog" canProcure={canManage}>
      <div className="page-heading"><h1>Katalog barang</h1></div>
      {error && messages[error] && <p role="alert" className="copy-error">{messages[error]}</p>}
      {saved && <p role="status">Barang tersimpan.</p>}
      {!profile ? <p>Hubungi pengelola Purchasing untuk mengaktifkan profil Anda.</p> : (
        <div className={canManage ? "setup-grid" : undefined}>
          <section className="setup-panel">
            <form action="/katalog" method="get" className="request-form">
              <label>Cari nama barang<input type="search" name="q" defaultValue={term} maxLength={80} /></label>
              <button className="button button-primary">Cari</button>
            </form>
            {result?.error ? <p role="alert">Katalog gagal dimuat.</p> :
              !result?.data?.length ? <p>{term ? "Barang yang dicari tidak ditemukan." : "Katalog masih kosong."}</p> :
              <ul className="module-list">
                {result.data.slice(0, 25).map((product) => (
                  <li key={product.id}>
                    <div className="w-full min-w-0">
                      <h3 className="wrap-anywhere">{product.name}</h3>
                      <p>{product.sku} · {product.unit}{canManage && (product.active ? " · Aktif" : " · Nonaktif")}</p>
                      {canManage && <details><summary className="inline-link cursor-pointer">Edit barang</summary><ProductForm product={product} /></details>}
                    </div>
                  </li>
                ))}
              </ul>}
            <nav className="flex gap-4" aria-label="Halaman katalog">
              {page > 1 && <Link className="inline-link" href={pageHref(page - 1)}>Sebelumnya</Link>}
              {(result?.data?.length ?? 0) > 25 && <Link className="inline-link" href={pageHref(page + 1)}>Berikutnya</Link>}
            </nav>
          </section>
          {canManage && <section className="setup-panel"><h2>Barang baru</h2><ProductForm /></section>}
        </div>
      )}
    </WorkspaceShell>
  );
}
