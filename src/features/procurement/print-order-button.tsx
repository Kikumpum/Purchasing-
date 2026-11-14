"use client";

export function PrintOrderButton() {
  return <button type="button" className="button button-primary" onClick={() => window.print()}>Cetak PO</button>;
}
