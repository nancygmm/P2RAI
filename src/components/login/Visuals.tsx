"use client";
/**
 * Visuales decorativos del landing (todos aria-hidden: el texto de cada capitulo ya dice lo mismo).
 * Usan la variable --p (0..1) que escribe la seccion padre para moverse con el scroll.
 * Los titulares son ficticios y solo ilustran el formato.
 */
import type { CSSProperties } from "react";
import { TOPICS } from "@/lib/locations";

const v = (vars: Record<string, string | number>) => vars as CSSProperties;

/* ---------- Hero: pila de titulares en 3D ---------- */
const DECK = [
  { topic: "Ciencia", title: "Estudiantes diseñan un sensor de calidad del aire", ok: false, src: 2, art: 3 },
  { topic: "Salud", title: "Jornada de vacunación se extiende una semana más", ok: true, src: 4, art: 2 },
  { topic: "Cultura", title: "Festival de cine independiente abre convocatoria", ok: true, src: 3, art: 1 },
  { topic: "Transporte", title: "Nueva ruta de bus conectará dos barrios del sur", ok: false, src: 2, art: 0 },
  { topic: "Clima", title: "Lluvias moderadas esta tarde en la zona centro", ok: true, src: 3, art: 4 },
];

export function HeroDeck() {
  return (
    <div className="login-deck" aria-hidden="true">
      <div className="login-deck-rig">
        <div className="login-deck-shadow" />
        {DECK.map((c, i) => (
          <div key={c.title} className="login-card" style={v({ "--i": i })}>
            <div className="login-card-inner">
              <div className={`login-art a${c.art}`}><i /><i /><i /></div>
              <div className="login-card-body">
                <span className="login-card-topic">{c.topic}</span>
                <b className="login-card-title">{c.title}</b>
                <span className="login-card-meta">
                  {c.ok ? <span className="badge ok">✓ Confirmado</span> : <span className="badge warn">◐ En desarrollo</span>}
                  <span>{c.src} fuentes</span>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <span className="login-deck-note">Titulares de ejemplo</span>
    </div>
  );
}

/* ---------- 01 Cerca de ti ---------- */
export function MapVisual() {
  return (
    <div className="login-v login-map">
      <div className="login-map-plane">
        <span className="login-map-road r1" />
        <span className="login-map-road r2" />
        <span className="login-map-road r3" />
        <span className="login-map-block b1" />
        <span className="login-map-block b2" />
        <span className="login-map-block b3" />
        <span className="login-map-ring" />
        <span className="login-map-ring two" />
        <span className="login-map-dot" />
      </div>
      <div className="login-map-pin">
        <svg viewBox="0 0 24 24" width="44" height="44" fill="currentColor">
          <path d="M12 22s-7.5-6.6-7.5-12.2a7.5 7.5 0 0 1 15 0C19.5 15.4 12 22 12 22z" />
          <circle cx="12" cy="9.8" r="2.8" fill="var(--card)" />
        </svg>
      </div>
      <span className="login-chip login-map-chip">Ubicación simulada · Ciudad de Guatemala</span>
      <span className="login-chip login-map-off">GPS: nunca</span>
    </div>
  );
}

/* ---------- 02 Fuentes visibles ---------- */
export function SourcesVisual() {
  return (
    <div className="login-v login-src">
      <div className="login-src-card">
        <div className="login-flip">
          <span className="login-flip-face"><span className="badge ok">✓ Confirmado</span></span>
          <span className="login-flip-face back"><span className="badge warn">◐ En desarrollo</span></span>
        </div>
        <b className="login-src-title">Puente peatonal reabre tras una revisión técnica</b>
        <ul className="login-src-list">
          {[["Diario Ejemplo", "Fuente 1"], ["Radio Municipal (ficticia)", "Fuente 2"], ["Comunicado oficial", "Fuente 3"]].map(([n, k], i) => (
            <li key={n} style={v({ "--i": i })}><i />{n}<em>{k}</em></li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ---------- 03 IA etiquetada ---------- */
export function AiVisual() {
  return (
    <div className="login-v login-ai">
      <div className="login-ai-stack">
        <div className="login-ai-layer img">
          <div className="login-art a2"><i /><i /><i /></div>
          <span className="login-ai-stamp">Ilustración generada con IA · no es una foto del hecho</span>
        </div>
        <div className="login-ai-layer sum">
          <span className="gen">Resumen generado con IA</span>
          <span className="login-line" /><span className="login-line" /><span className="login-line short" />
        </div>
        <div className="login-ai-layer tag">IA</div>
      </div>
    </div>
  );
}

/* ---------- 04 Nada se oculta ---------- */
const RANK = [
  { t: "Corte de agua programado en tu zona", r: 1 },
  { t: "Mercado local amplía horario", r: 0.78 },
  { t: "Liga nacional define calendario", r: 0.55 },
  { t: "Feria del libro anuncia invitados", r: 0.36 },
];
export function RankVisual() {
  return (
    <div className="login-v login-rank">
      <div className="login-rank-rig">
        {RANK.map((x, i) => (
          <div key={x.t} className="login-rank-row" style={v({ "--r": x.r, "--i": i })}>
            <b>{x.t}</b>
            <span className="login-rank-meter"><i /></span>
          </div>
        ))}
      </div>
      <span className="login-chip login-rank-chip">4 de 4 noticias visibles</span>
    </div>
  );
}

/* ---------- 05 Pregunta al chat ---------- */
export function ChatVisual() {
  return (
    <div className="login-v login-chat">
      <div className="login-chat-panel">
        <div className="login-bubble me">¿Qué pasa con el transporte hoy?</div>
        <div className="login-bubble bot">
          Según lo publicado, la nueva ruta de bus empieza el lunes<sup>1</sup> y el horario aún está en desarrollo<sup>2</sup>.
        </div>
        <div className="login-cites">
          <span><b>1</b> Nueva ruta de bus conectará…</span>
          <span><b>2</b> Horarios del transporte…</span>
        </div>
        <div className="login-typing"><i /><i /><i /></div>
      </div>
    </div>
  );
}

/* ---------- Final: orbita de temas ---------- */
export function TopicOrbit() {
  const n = TOPICS.length;
  return (
    <div className="login-orbit" aria-hidden="true">
      <div className="login-orbit-ring">
        {TOPICS.map((t, i) => (
          <span key={t} className="login-orbit-chip" style={v({ "--a": `${(360 / n) * i}deg` })}>{t}</span>
        ))}
      </div>
    </div>
  );
}
