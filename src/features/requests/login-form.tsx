"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { signIn } from "./actions";

function SubmitLogin() {
  const { pending } = useFormStatus();
  return <button className="button button-primary" type="submit" disabled={pending}>{pending ? "Sedang masuk…" : "Masuk"}</button>;
}

export function LoginForm({ hasError }: { hasError: boolean }) {
  const [visible, setVisible] = useState(false);
  return (
    <form action={signIn} className="request-form">
      {hasError && <p role="alert" className="copy-error">Tidak bisa masuk. Periksa email dan kata sandi Anda.</p>}
      <label>Email kerja<input type="email" name="email" autoComplete="username" required maxLength={254} /></label>
      <div className="login-password">
        <label>Kata sandi<input type={visible ? "text" : "password"} name="password" autoComplete="current-password" required maxLength={1024} /></label>
        <button className="password-toggle" type="button" aria-label={visible ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"} onClick={() => setVisible(!visible)}>
          {visible ? <EyeOff size={19} aria-hidden /> : <Eye size={19} aria-hidden />}
        </button>
      </div>
      <SubmitLogin />
    </form>
  );
}
