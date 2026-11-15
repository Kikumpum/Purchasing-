import Link from "next/link";
import { AccessShell } from "@/components/access-shell";
import { readSupabaseConfig } from "@/lib/supabase/config";
import { requestPasswordReset } from "@/features/requests/actions";
import { LoginForm } from "@/features/requests/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; pemulihan?: string }> }) {
  const { error, pemulihan } = await searchParams;
  const { config } = readSupabaseConfig(process.env);
  return (
    <AccessShell title="Purchasing" description="Masuk dengan email akun Purchasing Anda.">
        {config ? (
          <>
          <LoginForm hasError={Boolean(error)} />
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
        ) : process.env.VERCEL_ENV
          ? <p role="alert">Layanan masuk belum tersedia. Hubungi pengelola Purchasing.</p>
          : <p>Hubungkan Supabase sebelum masuk. <Link className="inline-link" href="/konfigurasi">Buka konfigurasi</Link></p>}
    </AccessShell>
  );
}
