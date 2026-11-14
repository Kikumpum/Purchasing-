"use client";

import { startTransition, useActionState, useState } from "react";
import { saveNewRequests } from "./actions";
import { ItemFields, type CatalogOption } from "./item-fields";

export function NewRequestForm({ firstId, products }: { firstId: string; products: CatalogOption[] }) {
  const [ids, setIds] = useState([firstId]);
  const [error, submit, pending] = useActionState(saveNewRequests, null);

  return (
    <form action={submit} className="request-form" onSubmit={(event) => {
      event.preventDefault();
      const fields = new FormData(event.currentTarget);
      startTransition(() => submit(fields));
    }}>
      <fieldset disabled={pending} className="grid min-w-0 gap-4">
        <label>Nomor OPKB {ids.length === 1 && "(opsional)"}
          <input name="opkbNumber" maxLength={80} required={ids.length > 1} />
        </label>
        <label>Tanggal OPKB (opsional)<input name="opkbDate" type="date" /></label>
        {ids.length > 1 && <p>Setiap barang disimpan sebagai draft PR tersendiri dengan nomor OPKB yang sama.</p>}
        {ids.map((id, index) => {
          const prefix = `${id}.`;
          return (
            <fieldset key={id} className="grid min-w-0 gap-3 border-t border-current/15 pt-3">
              <legend className="pr-2 font-semibold">Barang {index + 1}</legend>
              <input type="hidden" name="rows" value={id} />
              <ItemFields products={products} prefix={prefix} />
              <label>Kuantitas<input name={prefix + "quantity"} type="number" min={1} max={1000000} required /></label>
              <label>Tanggal kebutuhan<input name={prefix + "needBy"} type="date" required /></label>
              <label>Kebutuhan (unit kerja, alat, atau kegiatan)<textarea name={prefix + "purpose"} required maxLength={500} rows={2} /></label>
              <label>Keterangan (opsional)<textarea name={prefix + "note"} maxLength={500} rows={2} /></label>
              {ids.length > 1 && (
                <button type="button" className="button" onClick={() => setIds(ids.filter((rowId) => rowId !== id))}>Hapus barang {index + 1}</button>
              )}
            </fieldset>
          );
        })}
        {error && <p role="alert" className="copy-error">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" className="button" disabled={ids.length >= 30} onClick={() => {
            const id = crypto.randomUUID();
            setIds([...ids, id]);
          }}>Tambah barang</button>
          <button className="button button-primary" type="submit">{pending ? "Menyimpan…" : ids.length === 1 ? "Simpan draft" : `Simpan ${ids.length} draft`}</button>
        </div>
      </fieldset>
    </form>
  );
}
