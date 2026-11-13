import Link from "next/link";
import { WorkspaceShell } from "@/components/workspace-shell";

export default function NotFound() {
  return (
    <WorkspaceShell current="overview">
      <div className="page-heading">
        <h1>Halaman tidak ditemukan</h1>
        <p>Periksa alamat halaman atau kembali ke ringkasan workspace.</p>
      </div>
      <Link className="button button-primary" href="/">Kembali ke ringkasan</Link>
    </WorkspaceShell>
  );
}
