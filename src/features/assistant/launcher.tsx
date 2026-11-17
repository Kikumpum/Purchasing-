"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { MessageCircle } from "lucide-react";

const ChatPanel = dynamic(() => import("./chat-panel"), { ssr: false,
  loading: () => <p role="status" className="assistant-loading">Membuka panduan…</p> });

export function AssistantLauncher() {
  const [open, setOpen] = useState(false);
  return (
    <div className="assistant-widget print:hidden">
      <button type="button" className="assistant-launcher" onClick={() => setOpen(true)}
        aria-haspopup="dialog" aria-label="Buka Asisten Purchasing">
        <MessageCircle size={20} aria-hidden /> Bantuan
      </button>
      {open && <ChatPanel onClose={() => setOpen(false)} />}
    </div>
  );
}
