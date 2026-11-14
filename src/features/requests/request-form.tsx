import { randomUUID } from "node:crypto";
import { saveRequest } from "./actions";
import { ItemFields } from "./item-fields";
import { requireRequestSession } from "./session";

type Draft = {
  id: string; version: number; item_name: string; purpose: string; quantity: number; need_by: string;
  product_id: string | null; item_sku: string | null; item_unit: string | null;
};

export async function RequestForm({ draft }: { draft?: Draft }) {
  const { supabase } = await requireRequestSession();
  const { data, error } = await supabase.from("products").select("id, name, sku, unit")
    .eq("active", true).order("sku").limit(500);
  return (
    <form action={saveRequest} className="request-form">
      <input type="hidden" name="id" value={draft?.id ?? randomUUID()} />
      {draft && <input type="hidden" name="version" value={draft.version} />}
      {error && <p role="status">Katalog belum dapat dimuat. Anda bisa mengisi nama barang sendiri.</p>}
      <ItemFields draft={draft} products={data ?? []} key={draft?.version} />
      <label>Kuantitas<input name="quantity" type="number" defaultValue={draft?.quantity} min={1} max={1000000} required /></label>
      <label>Tanggal kebutuhan<input name="needBy" type="date" defaultValue={draft?.need_by} required /></label>
      <label>Tujuan kebutuhan<textarea name="purpose" defaultValue={draft?.purpose} required maxLength={500} rows={3} /></label>
      <button className="button button-primary" type="submit">Simpan draft</button>
    </form>
  );
}
