"use client";
import { useCallback, useRef, useState } from "react";
import { useAuth } from "./AuthProvider";
import { Reveal, ScrollProgressBar, ScrollScene, useInView, useReducedMotion } from "./motion";
import { Chapter } from "./login/Chapter";
import { AiVisual, ChatVisual, HeroDeck, MapVisual, RankVisual, SourcesVisual, TopicOrbit } from "./login/Visuals";
import "@/styles/login.css";

const DEMO_HINT = "Modo demo: Firebase no está configurado. Se usan noticias de ejemplo ficticias guardadas en este navegador.";

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function Login() {
  const { signIn, demo, error } = useAuth();
  const reduced = useReducedMotion();
  const heroCta = useRef<HTMLDivElement>(null);
  const finalRef = useRef<HTMLElement>(null);
  const heroCtaVisible = useInView(heroCta, { once: false, threshold: 0, rootMargin: "0px" });
  const finalVisible = useInView(finalRef, { once: false, threshold: 0.05, rootMargin: "0px" });
  const [pastHero, setPastHero] = useState(false);
  const onHero = useCallback((p: number) => setPastHero(p > 0.4), []);

  const label = demo ? "Entrar en modo demo" : "Continuar con Google";
  // La barra flotante aparece cuando el boton del hero ya no esta a mano y desaparece en el cierre.
  const showDock = (reduced ? !heroCtaVisible : pastHero) && !finalVisible;

  return (
    <main className="login" data-past={pastHero ? "true" : undefined}>
      <ScrollProgressBar className="login-progress" />

      {/* ---------- Hero ---------- */}
      <ScrollScene height="210vh" className="login-hero" stageClassName="login-stage" onProgress={onHero}>
        <div className="login-glow" aria-hidden="true" />
        <div className="login-hero-copy">
          <p className="login-kicker">
            <span className="login-live" aria-hidden="true" />
            {demo ? "Edición personal · modo demo" : "Edición personal"}
          </p>
          <h1 className="login-wordmark">noti8<span>.</span></h1>
          <p className="login-tagline">Noticias relevantes para ti, con fuentes visibles y sin ocultar lo importante.</p>
          <div ref={heroCta} className="login-cta-row">
            <button className="btn primary login-cta" onClick={signIn}>{label}<Arrow /></button>
          </div>
          {demo && <p className="hint login-hint">{DEMO_HINT}</p>}
          {error && <p className="error login-error" role="alert">{error}</p>}
        </div>
        <HeroDeck />
        <div className="login-hero-after" aria-hidden="true">
          <p className="login-kicker">Cómo funciona</p>
          <p className="login-hero-after-title">Una forma más honesta de leer noticias.</p>
        </div>
        <div className="login-cue" aria-hidden="true"><span>Desliza</span><i /></div>
      </ScrollScene>

      {/* ---------- Capitulos ---------- */}
      <div className="login-chapters">
        <Chapter n="01" kicker="Lo más cerca de ti" title={<>Cerca de ti, <em>sin pedir tu GPS.</em></>} visual={<MapVisual />}>
          <p>Eliges una <b>ubicación simulada</b> y la app prioriza lo que pasa a tu alrededor. Nunca usa el GPS de tu teléfono, y puedes cambiar la ubicación cuando quieras.</p>
        </Chapter>
        <Chapter n="02" kicker="Fuentes visibles" title={<>Cada noticia dice <em>de dónde viene.</em></>} visual={<SourcesVisual />} flip>
          <p>Ves sus fuentes y su estado: <span className="badge ok">✓ Confirmado</span> o <span className="badge warn">◐ En desarrollo</span>, para que sepas si la historia todavía puede cambiar.</p>
        </Chapter>
        <Chapter n="03" kicker="IA etiquetada" title={<>Si lo hizo una IA, <em>lo dice.</em></>} visual={<AiVisual />}>
          <p>Los resúmenes y las ilustraciones creados con IA siempre van marcados. Una ilustración generada nunca se presenta como foto del hecho.</p>
        </Chapter>
        <Chapter n="04" kicker="Nada se oculta" title={<>La relevancia ordena. <em>No esconde.</em></>} visual={<RankVisual />} flip>
          <p>Lo que más te importa sube y se ve más grande, pero ninguna noticia desaparece: la relevancia cambia el orden y el tamaño, nunca lo que puedes ver.</p>
        </Chapter>
        <Chapter n="05" kicker="Pregunta al chat" title={<>Pregunta. <em>Responde con lo publicado.</em></>} visual={<ChatVisual />}>
          <p>El chat responde solo con noticias publicadas en la app y cita cada dato con un enlace a su noticia. La conversación es temporal: se borra al cerrarla.</p>
        </Chapter>
      </div>

      {/* ---------- Cierre ---------- */}
      <section ref={finalRef} className="login-final">
        <TopicOrbit />
        <div className="login-final-copy">
          <Reveal as="p" variant="up" className="login-kicker">06 — Tu edición</Reveal>
          <Reveal as="h2" variant="rise3d" delay={80} className="login-final-title">Empieza a leer<br />distinto<span>.</span></Reveal>
          <Reveal variant="up" delay={200} className="login-final-actions">
            <button className="btn primary login-cta big" onClick={signIn}>{label}<Arrow /></button>
            {demo && <p className="hint login-hint">{DEMO_HINT}</p>}
            {error && <p className="error login-error">{error}</p>}
            <details className="hint login-install">
              <summary>¿Cómo instalar la app?</summary>
              <p><b>iPhone:</b> en Safari toca Compartir y luego “Agregar a inicio”.</p>
              <p><b>Android:</b> en Chrome abre el menú y toca “Instalar app”.</p>
            </details>
          </Reveal>
        </div>
      </section>

      {/* ---------- Barra flotante ---------- */}
      <div className={`login-dock${showDock ? " is-on" : ""}`} aria-hidden={!showDock} inert={!showDock}>
        <span className="login-dock-brand">noti8<span>.</span></span>
        <button className="btn primary login-cta" onClick={signIn} tabIndex={showDock ? 0 : -1}>{label}<Arrow /></button>
        {error && <p className="error login-dock-error">{error}</p>}
      </div>
    </main>
  );
}
