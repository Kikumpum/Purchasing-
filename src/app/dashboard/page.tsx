import Link from "next/link";
import { WorkspaceShell } from "@/components/workspace-shell";
import { signOut } from "@/features/requests/actions";
import { requireRequestSession, statusLabel } from "@/features/requests/session";

export const dynamic = "force-dynamic";

const roles = {
  employee: { title: "Employee", action: "Buka permintaan saya", href: "/permintaan",
    links: [{ label: "Katalog barang", href: "/katalog" }] },
  manager: { title: "Manager", action: "Buka permintaan tim", href: "/permintaan",
    links: [{ label: "Notifikasi persetujuan", href: "/notifikasi" }] },
  admin_procurement: { title: "Pengadaan", action: "Buka antrean pengadaan", href: "/pengadaan",
    links: [{ label: "Kelola barang", href: "/katalog" }, { label: "Kelola vendor", href: "/pengadaan/vendor" }, { label: "Gudang", href: "/gudang" }] },
  warehouse: { title: "Gudang", action: "Buka operasional gudang", href: "/gudang",
    links: [{ label: "Laporan gudang", href: "/laporan" }] },
};

type Role = keyof typeof roles;

function isRole(value: string): value is Role {
  return Object.hasOwn(roles, value);
}

export default async function DashboardPage() {
  const { supabase, profile, profileError } = await requireRequestSession();
  const role = profile?.role;
  if (!profile || !role || !isRole(role)) {
    return (
      <WorkspaceShell current="dashboard">
        <div className="page-heading"><h1>Akses Purchasing</h1></div>
        <section className="setup-panel">
          <p role="status">{profileError ? "Profil gagal dimuat. Coba muat ulang halaman." : "Hubungi pengelola Purchasing untuk mengaktifkan profil Anda."}</p>
          <form action={signOut}><button className="button">Keluar</button></form>
        </section>
      </WorkspaceShell>
    );
  }

  const dashboard = roles[role];
  const canProcure = role === "admin_procurement";
  const canWarehouse = canProcure || role === "warehouse";
  const recent = role === "warehouse" ? null : supabase.from("purchase_requests")
    .select("id, number, item_name, quantity, status")
    .order("created_at", { ascending: false }).order("id").limit(6);
  if (role === "employee") recent?.eq("requester_id", profile.id);
  if (role === "manager") recent?.eq("approver_id", profile.id).eq("status", "pending_approval");
  if (canProcure) recent?.eq("status", "approved");
  const metrics = await Promise.all(role === "warehouse" ? [
    supabase.rpc("warehouse_orders").then(({ data, error }) => ({
      label: "PO menunggu penerimaan",
      count: error ? null : ((data ?? []) as { status: string }[]).filter((row) => ["sent", "partial"].includes(row.status)).length,
    })),
    supabase.from("stock_reservation_balances").select("id", { count: "exact", head: true }).gt("remaining", 0)
      .then(({ count, error }) => ({ label: "Alokasi menunggu pengeluaran", count: error ? null : count })),
  ] : (role === "employee" ? [
    ["draft", "Draft"], ["revision_requested", "Perlu revisi"], ["pending_approval", "Menunggu persetujuan"], ["approved", "Disetujui"],
  ] : role === "manager" ? [
    ["pending_approval", "Menunggu keputusan Anda"], ["approved", "Disetujui di departemen"], ["rejected", "Ditolak"], ["revision_requested", "Perlu revisi"],
  ] : [["approved", "PR disetujui"]]).map(async ([status, label]) => {
    let query = supabase.from("purchase_requests").select("id", { count: "exact", head: true }).eq("status", status);
    if (role === "employee") query = query.eq("requester_id", profile.id);
    if (role === "manager" && status === "pending_approval") query = query.eq("approver_id", profile.id);
    const { count, error } = await query;
    return { label, count: error ? null : count };
  }));
  const activity = await recent;

  return (
    <WorkspaceShell current="dashboard" canProcure={canProcure} canWarehouse={canWarehouse}>
      <div className="page-heading flex flex-wrap items-start justify-between gap-3">
        <div><h1>Dashboard {dashboard.title}</h1><p>{profile.display_name}</p></div>
        <Link className="button button-primary" href={dashboard.href}>{dashboard.action}</Link>
      </div>
      <dl className="dashboard-metrics" aria-label="Ringkasan pekerjaan">
        {metrics.map(({ label, count }) => <div key={label}><dt>{label}</dt><dd>{count ?? "Gagal dimuat"}</dd></div>)}
      </dl>
      <div className="setup-grid">
        {activity && <section className="setup-panel">
          <h2>{role === "manager" ? "Antrean persetujuan" : "Permintaan terbaru"}</h2>
          {activity.error ? <p role="alert">Daftar permintaan gagal dimuat.</p>
            : !activity.data.length ? <p>Belum ada permintaan untuk ditampilkan.</p>
            : <div className="dashboard-table" tabIndex={0} role="region" aria-label="Daftar permintaan">
              <table>
                <thead><tr><th scope="col">Permintaan</th><th scope="col">Jumlah</th><th scope="col">Status</th></tr></thead>
                <tbody>{activity.data.map((row) => <tr key={row.id}>
                  <td><Link className="inline-link" href={`${canProcure ? "/pengadaan" : "/permintaan"}/${row.id}`}>PR-{row.number}</Link><p>{row.item_name}</p></td>
                  <td className="tabular-nums">{row.quantity}</td>
                  <td><span className="badge">{statusLabel[row.status]}</span></td>
                </tr>)}</tbody>
              </table>
            </div>}
        </section>}
        <section className="setup-panel">
          <h2>Akses cepat</h2>
          <ul className="module-list">{dashboard.links.map(({ href, label }) => (
            <li key={href}><Link className="inline-link" href={href}>{label}</Link></li>
          ))}</ul>
        </section>
      </div>
    </WorkspaceShell>
  );
}
