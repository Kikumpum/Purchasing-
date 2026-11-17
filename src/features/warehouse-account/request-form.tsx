"use client";

import { useActionState } from "react";
import { submitWarehouseAccountRequest } from "./actions";
import type { WarehouseAccountRequestState } from "./request";

const initialState: WarehouseAccountRequestState = { status: "idle" };
const messages = {
  invalid: "Periksa nama lengkap dan alamat email Anda.",
  unavailable: "Pengajuan belum dapat disimpan. Coba lagi nanti.",
  limited: "Layanan sedang menerima banyak pengajuan. Coba lagi nanti.",
};

export function WarehouseAccountRequestForm() {
  const [state, action, pending] = useActionState(submitWarehouseAccountRequest, initialState);
  if (state.status === "sent") {
    return <p className="setup-panel" role="status">
      Pengajuan Anda sudah tercatat. Pengelola akun akan memeriksa pengajuan dan mengirim tautan aktivasi lewat email jika disetujui.
    </p>;
  }

  const error = "name" in state ? messages[state.status] : null;
  return (
    <form action={action} className="request-form">
      {error && <p id="warehouse-request-error" role="alert" className="copy-error">{error}</p>}
      <fieldset className="grid gap-4" disabled={pending} aria-describedby={error ? "warehouse-request-error" : undefined}>
        <label>Nama lengkap<input name="name" autoComplete="name" required minLength={2} maxLength={120}
          defaultValue={"name" in state ? state.name : ""} /></label>
        <label>Email kerja<input name="email" type="email" autoComplete="email" required maxLength={254}
          defaultValue={"email" in state ? state.email : ""} /></label>
        <button type="submit" className="button button-primary">{pending ? "Mengirim…" : "Kirim pengajuan"}</button>
      </fieldset>
    </form>
  );
}
