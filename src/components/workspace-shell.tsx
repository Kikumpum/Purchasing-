import Link from "next/link";
import { PublisherFooter } from "@/components/publisher-footer";
import { signOut } from "@/features/requests/actions";
import { requireRequestSession } from "@/features/requests/session";
import {
  ArrowUpRight, Bell, ChartBar, FileText, Settings, Package, PanelLeft, LayoutGrid, Truck,
} from "lucide-react";

type Section = "overview" | "dashboard" | "setup" | "requests" | "catalog" | "procurement" | "warehouse" | "notifications" | "reports";
const sections: Record<Section, string> = {
  overview: "Ringkasan", setup: "Konfigurasi", requests: "Permintaan pembelian", catalog: "Katalog barang",
  procurement: "Pengadaan",
  warehouse: "Gudang",
  notifications: "Notifikasi",
  reports: "Laporan",
  dashboard: "Dashboard",
};

export async function WorkspaceShell({
  current,
  canProcure = current === "procurement",
  canWarehouse = canProcure,
  children,
}: {
  current: Section;
  canProcure?: boolean;
  canWarehouse?: boolean;
  children: React.ReactNode;
}) {
  const section = sections[current];
  const showSetup = !process.env.VERCEL_ENV;
  const profile = showSetup ? null : (await requireRequestSession()).profile;
  return (
    <div className="workspace">
      <aside className="sidebar">
        <Link href="/" className="wordmark">
          <span className="brand-mark" aria-hidden="true" />
          <span>Aryocorp<small>Purchasing</small></span>
        </Link>
        <nav className="desktop-navigation" aria-label="Navigasi utama">
          <WorkspaceLinks current={current} canProcure={canProcure} canWarehouse={canWarehouse} showSetup={showSetup} />
        </nav>
      </aside>
      <div className="workspace-body">
        <header className="topbar">
          <details className="mobile-navigation">
            <summary aria-label="Buka navigasi"><PanelLeft size={21} aria-hidden /></summary>
            <nav aria-label="Navigasi utama"><WorkspaceLinks current={current} canProcure={canProcure} canWarehouse={canWarehouse} showSetup={showSetup} /></nav>
          </details>
          <div className="breadcrumb"><Link href="/dashboard">Purchasing</Link><span aria-hidden>/</span><strong>{section}</strong></div>
          {showSetup && <a className="top-link" href="https://supabase.com/docs/guides/getting-started" target="_blank" rel="noreferrer">
            Panduan Supabase <ArrowUpRight size={13} aria-hidden />
          </a>}
          {profile && <div className="workspace-account">
            <Link href="/notifikasi" className="notification-link" aria-label="Notifikasi"><Bell size={19} aria-hidden /></Link>
            <details className="profile-menu">
              <summary aria-label="Menu profil">{profile.display_name.trim().slice(0, 2).toUpperCase()}</summary>
              <div className="profile-popover">
                <p className="wrap-anywhere font-medium">{profile.display_name}</p>
                <form action={signOut}><button className="button mt-3" type="submit">Keluar</button></form>
              </div>
            </details>
          </div>}
        </header>
        <main className="workspace-content" id="main-content" tabIndex={-1}>
          {children}
        </main>
        <PublisherFooter className="workspace-publisher print:hidden" />
      </div>
    </div>
  );
}

function WorkspaceLinks({ current, canProcure, canWarehouse, showSetup }: {
  current: Section; canProcure: boolean; canWarehouse: boolean; showSetup: boolean;
}) {
  return (
    <>
      <Link href="/dashboard" aria-current={current === "dashboard" ? "page" : undefined}>
        <LayoutGrid size={19} aria-hidden /> Dashboard
      </Link>
      <Link href="/permintaan" aria-current={current === "requests" ? "page" : undefined}>
        <FileText size={19} aria-hidden /> Permintaan pembelian
      </Link>
      <Link href="/katalog" aria-current={current === "catalog" ? "page" : undefined}>
        <Package size={19} aria-hidden /> Katalog barang
      </Link>
      {canProcure && <Link href="/pengadaan" aria-current={current === "procurement" ? "page" : undefined}>
        <Truck size={19} aria-hidden /> Pengadaan
      </Link>}
      {canWarehouse && <Link href="/gudang" aria-current={current === "warehouse" ? "page" : undefined}>
        <Package size={19} aria-hidden /> Gudang
      </Link>}
      <Link href="/notifikasi" aria-current={current === "notifications" ? "page" : undefined}>
        <Bell size={19} aria-hidden /> Notifikasi
      </Link>
      <Link href="/laporan" aria-current={current === "reports" ? "page" : undefined}>
        <ChartBar size={19} aria-hidden /> Laporan
      </Link>
      {showSetup && <Link href="/konfigurasi" aria-current={current === "setup" ? "page" : undefined}>
        <Settings size={19} aria-hidden /> Konfigurasi
      </Link>}
    </>
  );
}
