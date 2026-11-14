"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useState, type FormEvent } from "react";
import type { SupabaseConfiguration } from "@/lib/supabase/config";

export function ActivateAccount({ config }: { config: SupabaseConfiguration }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function activate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    setPending(true);
    setError("");
    try {
      const params = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      if (!accessToken || !refreshToken || params.get("type") !== "invite") {
        setError("Buka tautan undangan terbaru dari email Anda.");
        return;
      }
      const supabase = createBrowserClient(config.url, config.key, {
        cookieOptions: { sameSite: "lax", secure: window.location.protocol === "https:" },
        auth: { detectSessionInUrl: false },
      });
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken, refresh_token: refreshToken,
      });
      if (sessionError) {
        setError("Sesi undangan tidak dapat dibuka. Hubungi pengelola Purchasing.");
        return;
      }
      const { error: passwordError } = await supabase.auth.updateUser({ password });
      if (passwordError) {
        setError("Kata sandi tidak dapat disimpan. Coba kata sandi yang lebih kuat.");
        return;
      }
      window.location.replace("/dashboard");
    } catch {
      setError("Aktivasi gagal. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="request-form" onSubmit={activate}>
      {error && <p role="alert" className="copy-error">{error}</p>}
      <label>Kata sandi baru
        <input name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={72} />
      </label>
      <button type="submit" className="button button-primary" disabled={pending}>
        {pending ? "Menyimpan…" : "Aktifkan akun"}
      </button>
    </form>
  );
}
