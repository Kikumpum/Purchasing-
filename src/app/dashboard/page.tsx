import Link from "next/link";
import { WorkspaceShell } from "@/components/workspace-shell";
import { signOut } from "@/features/requests/actions";
import { requireRequestSession } from "@/features/requests/session";
import { StatusBadge } from "@/components/status-badge";

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

type WarehouseOrder = {
  id: string; number: number; item_name: string; item_unit: string | null;
  warehouse_name: string; quantity: number; received: number; status: string;
};

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
  const warehouseOrders = role === "warehouse" ? supabase.rpc("warehouse_orders") : null;
  const [metrics, activity, inbound] = await Promise.all([Promise.all(role === "warehouse" ? [
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
  })), recent, warehouseOrders]);
  const receivingQueue = ((inbound?.data ?? []) as WarehouseOrder[])
    .filter((order) => order.status === "sent" || order.status === "partial");
  if (inbound) {
    metrics.unshift(
      { label: "PO menunggu penerimaan", count: inbound.error ? null : receivingQueue.length },
      { label: "PO diterima sebagian", count: inbound.error ? null : receivingQueue.filter((order) => order.status === "partial").length },
    );
  }

  return (
    <WorkspaceShell current="dashboard" canProcure={canProcure} canWarehouse={canWarehouse}>
      <div className="page-heading flex flex-wrap items-start justify-between gap-3">
        <div><h1>Dashboard {dashboard.title}</h1><p>{profile.display_name}</p></div>
        <Link className="button button-primary" href={dashboard.href}>{dashboard.action}</Link>
      </div>
      <div className="dashboard-layout">
        {inbound && <section className="setup-panel">
          <h2>Antrean penerimaan gudang</h2>
          {inbound.error ? <p role="alert">Antrean penerimaan gagal dimuat.</p>
            : receivingQueue.length === 0 ? <p>Belum ada PO yang menunggu penerimaan.</p>
            : <div className="dashboard-table" tabIndex={0} role="region" aria-label="Antrean penerimaan">
              <table>
                <thead><tr><th scope="col">PO dan barang</th><th scope="col">Gudang</th><th scope="col">Sisa diterima</th></tr></thead>
                <tbody>{receivingQueue.slice(0, 6).map((order) => <tr key={order.id}>
                  <td><Link className="inline-link" href={`/gudang#penerimaan-${order.id}`}>PO-{order.number}</Link><p>{order.item_name}</p></td>
                  <td>{order.warehouse_name}</td>
                  <td className="tabular-nums">{order.quantity - order.received} {order.item_unit}</td>
                </tr>)}</tbody>
              </table>
            </div>}
        </section>}
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
                  <td><StatusBadge status={row.status} /></td>
                </tr>)}</tbody>
              </table>
            </div>}
        </section>}
        <div className="dashboard-aside">
          <section className="setup-panel">
            <h2>Ringkasan pekerjaan</h2>
            <dl className="dashboard-metrics">
              {metrics.map(({ label, count }) => <div key={label}><dt>{label}</dt><dd>{count ?? "Gagal dimuat"}</dd></div>)}
            </dl>
          </section>
          <section className="setup-panel">
            <h2>Akses cepat</h2>
            <ul className="module-list">{dashboard.links.map(({ href, label }) => (
              <li key={href}><Link className="inline-link" href={href}>{label}</Link></li>
            ))}</ul>
          </section>
        </div>
      </div>
    </WorkspaceShell>
  );
}
