import { randomUUID } from "node:crypto";
import { saveRequest } from "./actions";

type Draft = { id: string; version: number; item_name: string; purpose: string; quantity: number; need_by: string };

export function RequestForm({ draft }: { draft?: Draft }) {
  return (
    <form action={saveRequest} className="request-form">
      <input type="hidden" name="id" value={draft?.id ?? randomUUID()} />
      {draft && <input type="hidden" name="version" value={draft.version} />}
      <label>Barang<input name="item" defaultValue={draft?.item_name} required maxLength={160} /></label>
      <label>Kuantitas<input name="quantity" type="number" defaultValue={draft?.quantity} min={1} max={1000000} required /></label>
      <label>Tanggal kebutuhan<input name="needBy" type="date" defaultValue={draft?.need_by} required /></label>
      <label>Tujuan kebutuhan<textarea name="purpose" defaultValue={draft?.purpose} required maxLength={500} rows={3} /></label>
      <button className="button button-primary" type="submit">Simpan draft</button>
    </form>
  );
}
