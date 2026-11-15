"use client";

import { useState } from "react";
import { Copy } from "lucide-react";

export function CopyTemplate({ value }: { value: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      <button className="copy-button" type="button" onClick={copy}>
        <Copy size={16} aria-hidden /> {status === "copied" ? "Disalin" : "Salin template"}
      </button>
      <span className={status === "error" ? "copy-error" : "sr-only"} role="status">
        {status === "copied" && "Template disalin."}
        {status === "error" && "Salin teks secara manual."}
      </span>
    </>
  );
}
