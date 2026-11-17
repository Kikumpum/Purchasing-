import Link from "next/link";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { requireRequestSession } from "@/features/requests/session";
import { loadMovements, movementCells, movementHeaders, movementPageSize, parseMovementFilters } from "@/features/reports/movements";

export default async function MovementReport({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { profile, supabase } = await requireRequestSession();
  const canProcure = profile?.role === "admin_procurement";
  if (!canProcure && profile?.role !== "warehouse") redirect("/laporan");
  const search = await searchParams;
  const params = new URLSearchParams();
  for (const key of ["dari", "sampai", "jenis", "halaman"]) {
    const value = search[key];
    if (typeof value === "string") params.set(key, value);
  }
  const filter = parseMovementFilters(params);
  const result = filter ? await loadMovements(supabase, filter) : null;
  const href = (page: number) => {
    const next = new URLSearchParams(params);
    next.set("halaman", String(page));
    return `/laporan/pergerakan?${next}`;
  };

  return (
    <WorkspaceShell current="reports" canProcure={canProcure} canWarehouse>
      <div className="page-heading">
        <Link className="inline-link" href="/laporan">Kembali ke laporan</Link>
        <h1>Pergerakan stok</h1>
        <p>Rincian pengeluaran dan transfer sesuai akses gudang Anda.</p>
      </div>
      <section className="setup-panel">
        <form action="/laporan/pergerakan" className="request-form">
          <div className="flex flex-wrap items-end gap-3">
            <label>Dari (WIB)<input type="date" name="dari" defaultValue={params.get("dari") ?? ""} /></label>
            <label>Sampai (WIB)<input type="date" name="sampai" defaultValue={params.get("sampai") ?? ""} /></label>
            <label>Jenis<select name="jenis" defaultValue={params.get("jenis") ?? ""}>
              <option value="">Semua</option><option value="pengeluaran">Pengeluaran</option><option value="transfer">Transfer</option>
            </select></label>
            <button className="button button-primary">Terapkan filter</button>
          </div>
        </form>
        {!filter ? <p role="alert">Periksa filter dan urutan tanggal.</p>
          : result?.error ? <p role="alert">Pergerakan gagal dimuat. Muat ulang halaman untuk mencoba lagi.</p>
          : !result?.data?.length ? <p>Belum ada pergerakan pada halaman ini.</p>
          : <>
            <a className="inline-link" href={`/laporan/ekspor?${new URLSearchParams([...params, ["laporan", "pergerakan"]])}`}>Unduh CSV halaman ini</a>
            <div className="dashboard-table" tabIndex={0} role="region" aria-label="Rincian pergerakan stok">
              <table><thead><tr>{movementHeaders.map((label) => <th scope="col" key={label}>{label}</th>)}</tr></thead>
                <tbody>{result.data.slice(0, movementPageSize).map((row) => <tr key={row.id}>
                  {movementCells(row).map((value, index) => <td key={movementHeaders[index]}>{value}</td>)}
                </tr>)}</tbody>
              </table>
            </div>
          </>}
        {filter && <nav className="flex gap-4" aria-label="Halaman pergerakan">
          {filter.halaman > 1 && <Link className="inline-link" href={href(filter.halaman - 1)}>Sebelumnya</Link>}
          {filter.halaman < 10000 && (result?.data?.length ?? 0) > movementPageSize &&
            <Link className="inline-link" href={href(filter.halaman + 1)}>Berikutnya</Link>}
        </nav>}
      </section>
    </WorkspaceShell>
  );
}
