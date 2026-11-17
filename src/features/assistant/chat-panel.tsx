"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, ArrowUp, RotateCcw, X } from "lucide-react";
import { z } from "zod";
import { answerGuide, type GuideAnswer } from "./guide";
import {
  availabilitySchema, maxHistoryAnswerLength, maxHistoryTurns, maxQuestionLength, questionSchema,
  type AssistantAvailability,
} from "./chat-contract";

type Mode = "guide" | "ai";
type Turn = { question: string; answer: GuideAnswer; mode: Mode };
const suggestions = ["Cara membuat OPKB", "Siapa yang menyetujui PR?", "Cara menerima barang PO"];
const answerResponse = z.object({ answer: z.string().min(1).optional(), error: z.string().optional() });

export default function ChatPanel({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const thread = useRef<HTMLDivElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const [availability, setAvailability] = useState<AssistantAvailability>();
  const [selectedMode, setSelectedMode] = useState<Mode>();
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const mode = selectedMode ?? (availability === "ready" ? "ai" : "guide");
  const aiReady = availability === "ready";
  const checking = !availability && !selectedMode;

  useEffect(() => {
    dialog.current?.showModal();
    const controller = new AbortController();
    async function checkAvailability() {
      try {
        const response = await fetch("/api/asisten", {
          cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(5000)]),
        });
        if (!response.ok) throw new Error();
        const result = z.object({ availability: availabilitySchema }).parse(await response.json());
        setAvailability(result.availability);
      } catch {
        if (!controller.signal.aborted) setAvailability("unavailable");
      }
    }
    void checkAvailability();
    return () => { controller.abort(); requestRef.current?.abort(); };
  }, []);

  useEffect(() => {
    const element = thread.current;
    if (element && (turns.length || pending)) element.scrollTop = element.scrollHeight;
  }, [turns, pending]);

  function appendTurn(value: string, answer: GuideAnswer) {
    setTurns((previous) => [...previous.slice(-19), { question: value, answer, mode }]);
  }

  async function ask(value: string) {
    if (requestRef.current || checking || (mode === "ai" && !aiReady)) return;
    const parsed = questionSchema.safeParse(value);
    if (!parsed.success) { setError("Tulis pertanyaan antara 2 dan 1.000 karakter."); return; }
    const outgoing = parsed.data;
    setQuestion("");
    setError("");
    input.current?.focus();

    if (mode === "guide") { appendTurn(outgoing, answerGuide(outgoing)); return; }

    const history = turns.filter((turn) => turn.mode === "ai").slice(-maxHistoryTurns)
      .map((turn) => ({ question: turn.question, answer: turn.answer.text.slice(0, maxHistoryAnswerLength) }));
    const controller = new AbortController();
    requestRef.current = controller;
    setPending(outgoing);
    try {
      const response = await fetch("/api/asisten", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: outgoing, history }), signal: controller.signal,
      });
      const result = answerResponse.parse(await response.json());
      if (!response.ok || !result.answer) {
        if (response.status === 401) {
          setSelectedMode("ai");
          setAvailability("sign-in");
        }
        setError(result.error || "AI belum dapat menjawab. Coba lagi atau buka Panduan.");
        setQuestion((draft) => draft || outgoing);
        return;
      }
      appendTurn(outgoing, { text: result.answer });
    } catch {
      if (!controller.signal.aborted) {
        setError("Jawaban belum sampai. Coba kirim lagi.");
        setQuestion((draft) => draft || outgoing);
      }
    } finally {
      requestRef.current = null;
      setPending("");
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask(question);
  }

  function chooseMode(value: Mode) {
    setSelectedMode(value);
    setError("");
  }

  return (
    <dialog ref={dialog} className="assistant-dialog" data-mode={mode} aria-labelledby="assistant-title" onClose={onClose}
      onClick={(event) => { if (event.target === dialog.current) dialog.current?.close(); }}>
      <div className="assistant-panel">
        <header className="assistant-header">
          <span className="brand-mark assistant-brand" aria-hidden />
          <h2 id="assistant-title">Asisten Purchasing</h2>
          {turns.length > 0 && <button type="button" className="assistant-icon-button" disabled={Boolean(pending)}
            aria-label="Mulai chat baru" title="Mulai chat baru" onClick={() => { setTurns([]); setQuestion(""); setError(""); }}>
            <RotateCcw size={17} aria-hidden />
          </button>}
          <button type="button" className="assistant-icon-button" aria-label="Tutup asisten" onClick={() => dialog.current?.close()}>
            <X size={21} aria-hidden />
          </button>
        </header>

        <div className="assistant-modes" role="group" aria-label="Mode bantuan">
          <button type="button" disabled={Boolean(pending)} aria-pressed={mode === "ai" && !checking} onClick={() => chooseMode("ai")}>Tanya AI</button>
          <button type="button" disabled={Boolean(pending)} aria-pressed={mode === "guide" && !checking} onClick={() => chooseMode("guide")}>Panduan</button>
        </div>

        <div className="assistant-messages" ref={thread}>
          {mode === "ai" && !aiReady && <div className="assistant-notice" role="status">
            {availability === "sign-in" ? <><p>Masuk ke Purchasing untuk mulai ngobrol dengan AI.</p><Link className="inline-link" href="/masuk" onClick={() => dialog.current?.close()}>Ke halaman masuk</Link></>
              : <p>{!availability ? "Mengecek ketersediaan AI…" : availability === "inactive"
                ? "Akun aktif diperlukan untuk memakai AI." : availability === "unconfigured"
                  ? "Tanya AI belum diaktifkan. Panduan Purchasing bisa langsung dipakai."
                  : "Tanya AI sedang tidak tersedia."}</p>}
            {availability && <button type="button" className="inline-link" onClick={() => chooseMode("guide")}>Buka Panduan</button>}
          </div>}
          {!turns.length && !pending && (
            <div className="assistant-welcome">
              <p className="assistant-greeting">Halo, ada yang bisa saya bantu?</p>
              <p>{mode === "ai" ? "Tanyakan tentang Purchasing atau topik lain." : "Saya bisa bantu soal permintaan, pengadaan, dan gudang."}</p>
              <div className="assistant-suggestions">
                {suggestions.map((suggestion) => <button type="button" key={suggestion}
                  disabled={checking || (mode === "ai" && !aiReady)} onClick={() => void ask(suggestion)}>
                  {suggestion}<ArrowRight size={15} aria-hidden />
                </button>)}
              </div>
            </div>
          )}
          <div className="assistant-thread" role="log" aria-label="Percakapan bantuan">
            {turns.map((turn, index) => <div className="assistant-turn" key={index}>
              <p className="assistant-message assistant-user"><span className="sr-only">Anda. </span>{turn.question}</p>
              <div className="assistant-message">
                <p><span className="sr-only">{turn.mode === "ai" ? "Asisten AI. " : "Panduan. "}</span>{turn.answer.text}</p>
                {turn.answer.href && <Link className="inline-link" href={turn.answer.href} onClick={() => dialog.current?.close()}>Buka {turn.answer.title}</Link>}
              </div>
            </div>)}
            {pending && <p className="assistant-message assistant-user"><span className="sr-only">Anda. </span>{pending}</p>}
          </div>
          {pending && <p className="assistant-typing" role="status">Asisten sedang menjawab…</p>}
        </div>

        <form className="assistant-form" onSubmit={submit}>
          {error && <p className="assistant-error" id="assistant-error" role="alert">{error}</p>}
          <div className="assistant-composer">
            <label className="sr-only" htmlFor="assistant-question">Pesan Anda</label>
            <textarea ref={input} id="assistant-question" value={question} onChange={(event) => setQuestion(event.target.value)}
              placeholder="Tulis pesan…" rows={1} maxLength={maxQuestionLength}
              aria-describedby={error ? "assistant-error" : mode === "ai" && aiReady ? "assistant-privacy" : undefined}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
                event.preventDefault();
                if (question.trim().length >= 2) event.currentTarget.form?.requestSubmit();
              }} />
            <button type="submit" aria-label="Kirim pesan" className="assistant-send"
              disabled={checking || Boolean(pending) || question.trim().length < 2 || (mode === "ai" && !aiReady)}>
              <ArrowUp size={21} aria-hidden />
            </button>
          </div>
          {mode === "ai" && aiReady && <p className="assistant-privacy" id="assistant-privacy">
            Gemini menerima pesan dan konteks terbaru. Google dapat memakai data paket gratis untuk peningkatan layanan. Hindari data rahasia.
          </p>}
        </form>
      </div>
    </dialog>
  );
}
