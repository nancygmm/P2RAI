"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { VerificationBadge } from "@/components/Badges";
import { Reveal, stagger } from "@/components/motion";
import { useStore } from "@/lib/store";
import type { ChatResponse } from "@/lib/types";
import "@/styles/chat.css";

type Msg = { role: "user"; text: string } | { role: "bot"; res: ChatResponse } | { role: "error"; text: string };

const LABEL: Record<ChatResponse["generatedBy"], string> = {
  ia: "Resumen generado por IA a partir de noticias publicadas",
  extractivo: "Resúmenes publicados por el editor (el modelo no redactó esta respuesta)",
  ninguno: "Sin resultados",
};

const STEPS = [
  { t: "Preguntas", d: "Escribe lo que quieres saber en lenguaje natural." },
  { t: "Busco en noticias publicadas", d: "Solo uso lo que ya está en la app, nunca la web abierta." },
  { t: "Cito cada dato", d: "Cada afirmación enlaza a su noticia y muestra si está confirmada." },
];

const TITLE = ["Pregunta", "por", "las", "noticias"];

/** Chat temporal: el historial vive solo en memoria y se pierde al cerrar. */
export default function ChatPage() {
  const { getToken } = useAuth();
  const { location, demoArticles } = useStore();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  const suggestions = [
    "¿Qué pasó hoy?",
    `¿Qué noticias hay cerca de mi zona?`,
    "¿Qué pasa en el mundo?",
    "Novedades sobre transporte",
  ];

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const id = setTimeout(() => end.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 60);
    return () => clearTimeout(id);
  }, [msgs.length, busy]);

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
    }
  }

  return (
    <main className={`chat${busy ? " is-busy" : ""}`}>
      <div className="c-feed">
        {msgs.length === 0 && (
          <div className="c-hero">
            <div className="c-orb-wrap" aria-hidden>
              <div className="c-orb">
                <span className="c-ring r3" /><span className="c-ring r2" /><span className="c-ring r1" /><span className="c-core" />
              </div>
            </div>
            <p className="c-kicker">Noticias verificadas · IA responsable</p>
            <h2 className="c-title" aria-label="Pregunta por las noticias">
              {TITLE.map((w, i) => (
                <span key={i} aria-hidden>
                  <span className={`w${i === 3 ? " g" : ""}`} style={{ ["--i" as string]: i }}>{w}</span>{" "}
                </span>
              ))}
            </h2>
            <p className="c-lead">Respondo solo con noticias publicadas en la app, desde {location.city}. Cada dato enlaza a su noticia.</p>
            <div className="c-chips">
              {suggestions.map((s, i) => (
                <button key={s} className="c-chip" style={{ ["--i" as string]: i }} onClick={() => ask(s)}>{s}</button>
              ))}
            </div>
            <ol className="c-how">
              {STEPS.map((s, i) => (
                <Reveal as="li" key={s.t} variant={i % 2 ? "flip" : "tilt"} delay={stagger(i)} className="c-step">
                  <span className="n">{i + 1}</span>
                  <div><b>{s.t}</b><span>{s.d}</span></div>
                </Reveal>
              ))}
            </ol>
          </div>
        )}
        {msgs.map((m, i) =>
          m.role === "user" ? (
            <Reveal key={i} variant="zoom" className="c-msg user">{m.text}</Reveal>
          ) : m.role === "error" ? (
            <Reveal key={i} variant="rise3d" className="c-msg bot err"><span className="error">{m.text}</span></Reveal>
          ) : (
            <Reveal key={i} variant="rise3d" className="c-msg bot">
              <div className="gen">{LABEL[m.res.generatedBy]}</div>
              {m.res.notice && <p className="c-notice">{m.res.notice}</p>}
              <ul className="c-claims">
                {m.res.claims.map((c, j) => (
                  <Reveal as="li" key={j} variant="up" delay={120 + stagger(j, 110, 660)} className={`c-claim ${c.verification}`}>
                    <p>{c.text}</p>
                    <div className="c-cite">
                      <VerificationBadge v={c.verification} />
                      <Link href={`/noticia/${c.articleId}`}>Noticia: {c.title}</Link>
                    </div>
                    {c.sources?.length > 0 && (
                      <div className="c-cite">
                        <span>Fuentes: {c.sources.map((s) => `${s.name}${s.supports === "contradice" ? " (contradice)" : ""}`).join(", ")}</span>
                      </div>
                    )}
                    {c.contradictory && <div className="c-cite c-warn">Las fuentes de esta noticia se contradicen: no está confirmada.</div>}
                  </Reveal>
                ))}
              </ul>
            </Reveal>
          )
        )}
        {busy && (
          <div className="c-typing" role="status">
            <span className="c-dots" aria-hidden><i /><i /><i /></span>
            Buscando en las noticias publicadas…
          </div>
        )}
        <div ref={end} />
      </div>
      <form className="c-composer" onSubmit={(e) => { e.preventDefault(); ask(text); }}>
        <div className="c-pill">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Escribe tu pregunta" maxLength={500} aria-label="Pregunta" />
          <button className="c-send" disabled={busy || !text.trim()} aria-label="Enviar pregunta">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 19V5M5 12l7-7 7 7" /></svg>
          </button>
        </div>
      </form>
    </main>
  );
}
