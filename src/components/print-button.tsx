"use client";

export function PrintButton({ label }: { label: string }) {
  return <button type="button" className="button button-primary print:hidden" onClick={() => window.print()}>{label}</button>;
}
