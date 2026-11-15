import Link from "next/link";
import { AccessShell } from "@/components/access-shell";

export default function NotFound() {
  return (
    <AccessShell title="Halaman tidak ditemukan" description="Periksa alamat halaman atau kembali ke awal.">
      <Link className="button button-primary" href="/">Kembali ke awal</Link>
    </AccessShell>
  );
}
