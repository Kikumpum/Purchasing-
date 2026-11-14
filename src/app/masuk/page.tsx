import Link from "next/link";
import { WorkspaceShell } from "@/components/workspace-shell";
import { readSupabaseConfig } from "@/lib/supabase/config";
import { requestPasswordReset, signIn } from "@/features/requests/actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; pemulihan?: string }> }) {
  const { error, pemulihan } = await searchParams;
  const { config } = readSupabaseConfig(process.env);
  return (
    <WorkspaceShell current="requests">
      <div className="page-heading"><h1>Masuk ke Purchasing</h1></div>
      <section className="setup-panel max-w-lg">
        {config ? (
          <>
          <form action={signIn} className="request-form">
            {error && <p role="alert" className="copy-error">Tidak bisa masuk. Periksa email dan kata sandi Anda.</p>}
            <label>Email kerja<input type="email" name="email" autoComplete="username" required maxLength={254} /></label>
            <label>Kata sandi<input type="password" name="password" autoComplete="current-password" required maxLength={1024} /></label>
            <button className="button button-primary" type="submit">Masuk</button>
          </form>
          <details open={Boolean(pemulihan) || undefined}>
            <summary className="inline-link cursor-pointer">Lupa kata sandi?</summary>
            {pemulihan === "email" && <p role="alert">Masukkan alamat email yang valid.</p>}
            {pemulihan === "dikirim" && <p role="status">Jika pemulihan tersedia untuk akun Anda, tautan akan dikirim melalui email. Periksa juga folder spam.</p>}
            <form action={requestPasswordReset} className="request-form">
              <label>Email akun<input type="email" name="email" autoComplete="email" required maxLength={254} /></label>
              <button className="button button-primary">Minta tautan pemulihan</button>
            </form>
          </details>
          </>
        ) : <p>Hubungkan Supabase sebelum masuk. <Link className="inline-link" href="/konfigurasi">Buka konfigurasi</Link></p>}
      </section>
    </WorkspaceShell>
  );
}
