"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { z } from "zod";
import { answerGuide, type GuideAnswer } from "./guide";

type Message = GuideAnswer & { role: "user" | "assistant" };
const questionSchema = z.string().trim().min(2).max(1000);
const suggestions = ["Bagaimana membuat OPKB?", "Apa jobdesk setiap peran?", "Bagaimana menerima barang PO?"];

export default function ChatPanel({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const [mode, setMode] = useState<"guide" | "ai">("guide");
  const [busy, setBusy] = useState(false);
  const [question, setQuestion] = useState("");
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => { dialog.current?.showModal(); return () => requestRef.current?.abort(); }, []);
  useEffect(() => { end.current?.scrollIntoView({ block: "nearest" }); }, [messages]);

  async function ask(value: string) {
    if (busy) return;
    const parsed = questionSchema.safeParse(value);
    if (!parsed.success) { setError("Tulis pertanyaan antara 2 dan 1.000 karakter."); return; }
    setMessages((previous) => [...previous.slice(-18), { role: "user", text: parsed.data }]);
    setQuestion("");
    setError("");
    if (mode === "guide") {
      setMessages((previous) => [...previous, { role: "assistant", ...answerGuide(parsed.data) }]);
      return;
    }
    setBusy(true);
    const controller = new AbortController();
    requestRef.current = controller;
    try {
      const response = await fetch("/api/asisten", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: parsed.data }), signal: controller.signal,
      });
      const result = z.object({ answer: z.string().optional(), error: z.string().optional() }).parse(await response.json());
      if (!response.ok || !result.answer) {
        setError(result.error || "AI belum dapat menjawab. Coba mode Panduan.");
        setQuestion(parsed.data);
      } else {
        setMessages((previous) => [...previous, { role: "assistant", text: result.answer ?? "" }]);
      }
    } catch {
      if (!controller.signal.aborted) { setError("Koneksi terputus. Coba kirim ulang pertanyaan."); setQuestion(parsed.data); }
    } finally { setBusy(false); }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    ask(question);
  }

  return (
    <dialog ref={dialog} className="assistant-dialog" aria-labelledby="assistant-title" onClose={onClose}
      onClick={(event) => { if (event.target === dialog.current) dialog.current?.close(); }}>
      <div className="assistant-panel">
        <header className="assistant-header">
          <div><h2 id="assistant-title">Asisten Purchasing</h2><p>Panduan aplikasi dan tanya AI</p></div>
          <button type="button" className="assistant-close" aria-label="Tutup asisten" onClick={() => dialog.current?.close()}><X size={20} /></button>
        </header>
        <div className="assistant-messages">
          <p>Saya dapat membantu menjelaskan menu dan alur kerja Purchasing. Pilih topik atau tulis pertanyaan Anda.</p>
          <div className="assistant-modes" role="group" aria-label="Mode bantuan">
            <button type="button" disabled={busy} aria-pressed={mode === "guide"} onClick={() => { setMode("guide"); setError(""); }}>Panduan</button>
            <button type="button" disabled={busy} aria-pressed={mode === "ai"} onClick={() => { setMode("ai"); setError(""); }}>Tanya AI</button>
          </div>
          <p className="text-sm text-muted">{mode === "guide" ? "Jawaban dari panduan aplikasi." : "Pertanyaan dikirim ke Google Gemini dan dapat digunakan Google untuk meningkatkan produknya pada paket gratis. Masuk untuk memakai AI. Kuota terbatas. Periksa kembali jawaban AI."}</p>
          <div className="assistant-suggestions">{suggestions.map((suggestion) =>
            <button type="button" key={suggestion} disabled={busy} onClick={() => void ask(suggestion)}>{suggestion}</button>)}</div>
          <div role="log" aria-label="Percakapan bantuan" aria-live="polite" aria-relevant="additions">
            {messages.map((message, index) => <div key={index} className={message.role === "user" ? "assistant-message assistant-user" : "assistant-message"}>
              <p className="text-sm font-medium">{message.role === "user" ? "Anda" : "Asisten Purchasing"}</p>
              <p>{message.text}</p>
              {message.href && <Link className="inline-link" href={message.href} onClick={() => dialog.current?.close()}>Buka {message.title}</Link>}
            </div>)}
          </div>
          {busy && <p role="status">AI sedang menjawab…</p>}
          <div ref={end} />
        </div>
        <form className="assistant-form" onSubmit={submit}>
          <label htmlFor="assistant-question">Pertanyaan Anda</label>
          <textarea disabled={busy} id="assistant-question" value={question} onChange={(event) => setQuestion(event.target.value)}
            placeholder="Tanyakan cara menggunakan Purchasing" rows={2} maxLength={1000} required
            aria-describedby={error ? "assistant-error" : undefined} aria-invalid={Boolean(error)} />
          {error && <p id="assistant-error" role="alert">{error}</p>}
          <div className="flex items-center justify-between gap-3">
            <button type="button" disabled={busy} className="inline-link" onClick={() => { setMessages([]); setError(""); }}>Bersihkan chat</button>
            <button type="submit" disabled={busy} className="button button-primary">{busy ? "Menunggu…" : "Kirim"}</button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
