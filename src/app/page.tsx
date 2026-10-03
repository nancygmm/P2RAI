"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { VerificationBadge } from "@/components/Badges";
import { useStore } from "@/lib/store";
import type { ChatResponse } from "@/lib/types";

type Msg = { role: "user"; text: string } | { role: "bot"; res: ChatResponse } | { role: "error"; text: string };

const LABEL: Record<ChatResponse["generatedBy"], string> = {
  ia: "Resumen generado por IA a partir de noticias publicadas",
  extractivo: "Resúmenes publicados, sin intervención de IA",
  ninguno: "Sin resultados",
};

/** Chat temporal: el historial vive solo en memoria y se pierde al cerrar. */
export default function ChatPage() {
  const { getToken } = useAuth();
  const { location, demoArticles } = useStore();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  const suggestions = [
    "¿Qué pasó hoy?",
    `¿Qué noticias hay cerca de mi zona?`,
    "¿Qué pasa en Madrid?",
    "Novedades sobre transporte",
  ];

  async function ask(q: string) {
    const question = q.trim();
    if (!question || busy) return;
    setText("");
    setBusy(true);
    const history = msgs.filter((m) => m.role === "user").map((m) => (m as { text: string }).text);
    setMsgs((m) => [...m, { role: "user", text: question }]);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${await getToken()}` },
        body: JSON.stringify({ question, locationId: location.id, history, demoArticles }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? `Error ${res.status}`);
      const data = (await res.json()) as ChatResponse;
      setMsgs((m) => [...m, { role: "bot", res: data }]);
    } catch (e) {
      setMsgs((m) => [...m, { role: "error", text: e instanceof Error ? e.message : "Error" }]);
    } finally {
      setBusy(false);
      setTimeout(() => end.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  return (
    <main className="chat">
      <div className="msgs">
        {msgs.length === 0 && (
          <div className="empty">
            <h2>Pregunta por las noticias</h2>
            <p>Respondo solo con noticias publicadas en la app, desde {location.city}. Cada dato enlaza a su noticia.</p>
            <div className="chips">{suggestions.map((s) => <button key={s} onClick={() => ask(s)}>{s}</button>)}</div>
          </div>
        )}
        {msgs.map((m, i) =>
          m.role === "user" ? <div key={i} className="msg user">{m.text}</div>
          : m.role === "error" ? <div key={i} className="msg bot error">{m.text}</div>
          : (
            <div key={i} className="msg bot">
              <div className="gen">{LABEL[m.res.generatedBy]}</div>
              {m.res.notice && <p className="notice">{m.res.notice}</p>}
              <ul className="claims">
                {m.res.claims.map((c, j) => (
                  <li key={j} className={c.verification}>
                    <p>{c.text}</p>
                    <div className="cite">
                      <VerificationBadge v={c.verification} />
                      <Link href={`/noticia/${c.articleId}`}>Fuente: {c.title}</Link>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )
        )}
        {busy && <div className="msg bot">Buscando en las noticias publicadas…</div>}
        <div ref={end} />
      </div>
      <form className="composer" onSubmit={(e) => { e.preventDefault(); ask(text); }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Escribe tu pregunta" maxLength={500} aria-label="Pregunta" />
        <button className="btn primary" disabled={busy || !text.trim()}>Enviar</button>
      </form>
    </main>
  );
}
