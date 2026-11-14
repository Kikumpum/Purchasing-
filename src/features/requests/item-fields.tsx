"use client";

import { useState } from "react";

export type CatalogOption = { id: string; name: string; sku: string; unit: string };

export function ItemFields({ products, draft, prefix = "" }: {
  products: CatalogOption[];
  prefix?: string;
  draft?: { product_id: string | null; item_name: string; item_sku: string | null; item_unit: string | null; requested_unit: string | null };
}) {
  const [productId, setProductId] = useState(draft?.product_id ?? "");
  const snapshot = draft?.product_id && {
    id: draft.product_id, name: draft.item_name, sku: draft.item_sku, unit: draft.item_unit,
  };
  const options = snapshot ? [snapshot, ...products.filter((product) => product.id !== snapshot.id)] : products;

  return (
    <>
      {options.length > 0 && (
        <label>Barang dari katalog
          <select name={prefix + "product"} value={productId} onChange={(event) => setProductId(event.target.value)}>
            <option value="">Isi nama barang sendiri</option>
            {options.map((product) => <option value={product.id} key={product.id}>{product.sku} · {product.name} ({product.unit})</option>)}
          </select>
        </label>
      )}
      {!productId && <label>Nama barang<input name={prefix + "item"} defaultValue={draft?.product_id ? "" : draft?.item_name} required maxLength={160} /></label>}
      {!productId && <label>Satuan (opsional)<input name={prefix + "requestedUnit"} defaultValue={draft?.requested_unit ?? ""} maxLength={30} placeholder="Contoh: PCS, SET, ROLL" /></label>}
    </>
  );
}
