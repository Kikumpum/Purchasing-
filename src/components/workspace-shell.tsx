import Link from "next/link";
import {
  ArrowUpRight, FileText, GearSix, ListDashes, Package, SidebarSimple, SquaresFour, Truck,
} from "@phosphor-icons/react/dist/ssr";

type Section = "overview" | "setup" | "requests" | "catalog" | "procurement";
const sections: Record<Section, string> = {
  overview: "Ringkasan", setup: "Konfigurasi", requests: "Permintaan pembelian", catalog: "Katalog barang",
  procurement: "Pengadaan",
};

export function WorkspaceShell({
  current,
  canProcure = current === "procurement",
  children,
}: {
  current: Section;
  canProcure?: boolean;
  children: React.ReactNode;
}) {
  const section = sections[current];
  return (
    <div className="workspace">
      <aside className="sidebar">
        <Link href="/" className="wordmark">
          <span className="brand-mark"><ListDashes size={19} weight="bold" aria-hidden /></span>
          <span>Purchasing</span>
        </Link>
        <nav className="desktop-navigation" aria-label="Navigasi utama">
          <WorkspaceLinks current={current} canProcure={canProcure} />
        </nav>
        <div className="sidebar-foot">
          <span className="local-dot" />
          Workspace
        </div>
      </aside>
      <div className="workspace-body">
        <header className="topbar">
          <details className="mobile-navigation">
            <summary aria-label="Buka navigasi"><SidebarSimple size={21} aria-hidden /></summary>
            <nav aria-label="Navigasi utama"><WorkspaceLinks current={current} canProcure={canProcure} /></nav>
          </details>
          <div className="breadcrumb"><span>Workspace</span><span aria-hidden>/</span><strong>{section}</strong></div>
          <a className="top-link" href="https://supabase.com/docs/guides/getting-started" target="_blank" rel="noreferrer">
            Panduan Supabase <ArrowUpRight size={13} aria-hidden />
          </a>
        </header>
        <main className="workspace-content" id="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}

function WorkspaceLinks({ current, canProcure }: { current: Section; canProcure: boolean }) {
  return (
    <>
      <Link href="/" aria-current={current === "overview" ? "page" : undefined}>
        <SquaresFour size={19} aria-hidden /> Ringkasan
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
      <Link href="/konfigurasi" aria-current={current === "setup" ? "page" : undefined}>
        <GearSix size={19} aria-hidden /> Konfigurasi
      </Link>
    </>
  );
}
