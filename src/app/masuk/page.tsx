import Link from "next/link";
import { WorkspaceShell } from "@/components/workspace-shell";
import { readSupabaseConfig } from "@/lib/supabase/config";
import { signIn } from "@/features/requests/actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { config } = readSupabaseConfig(process.env);
  return (
    <WorkspaceShell current="requests">
      <div className="page-heading"><h1>Masuk ke Purchasing</h1></div>
      <section className="setup-panel max-w-lg">
        {config ? (
          <form action={signIn} className="request-form">
            {error && <p role="alert" className="copy-error">Tidak bisa masuk. Periksa email dan kata sandi Anda.</p>}
            <label>Email kerja<input type="email" name="email" autoComplete="username" required maxLength={254} /></label>
            <label>Kata sandi<input type="password" name="password" autoComplete="current-password" required maxLength={1024} /></label>
            <button className="button button-primary" type="submit">Masuk</button>
          </form>
        ) : <p>Hubungkan Supabase sebelum masuk. <Link className="inline-link" href="/konfigurasi">Buka konfigurasi</Link></p>}
      </section>
    </WorkspaceShell>
  );
}
