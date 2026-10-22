"use client";
import type { CSSProperties } from "react";
import { VerificationBadge } from "@/components/Badges";
import { Reveal, ScrollScene, stagger } from "@/components/motion";
import type { Source, Verification } from "@/lib/types";
import { parseSourceUrl, registrableDomain } from "@/lib/validation";

const TYPE = { primaria: "Fuente primaria", oficial: "Fuente oficial", medio: "Medio" } as const;
const vars = (o: Record<string, string | number>) => o as CSSProperties;

/** Medidor de verificacion (derivado solo de las fuentes registradas) + abanico 3D de tarjetas que se abre al hacer scroll. */
export function SourcesChapter({ sources, verification }: { sources: Source[]; verification: Verification }) {
  const n = sources.length;
  const confirm = sources.filter((s) => s.supports === "confirma");
  const contra = n - confirm.length;
  const independent = new Set(confirm.map((s) => { const u = parseSourceUrl(s.url); return u ? registrableDomain(u.hostname) : s.url; })).size;
  const primary = confirm.some((s) => s.type === "primaria" || s.type === "oficial");
  const note = contra > 0
    ? "Hay versiones contradictorias entre las fuentes."
    : independent >= 2
      ? "Confirmada por medios distintos entre sí."
      : primary
        ? "Respaldada por una fuente primaria u oficial."
        : "Aún sin confirmación independiente.";

  const deck = (
    <ul className="a-deck" style={vars({ "--n": n, "--c": (n - 1) / 2 })}>
      {sources.map((s, i) => {
        const ok = s.supports === "confirma";
        const link = !!parseSourceUrl(s.url);
        return (
          <li key={i} className={`a-card ${ok ? "ok" : "no"}`} style={vars({ "--i": i, "--st": stagger(i) })}>
            <span className="a-card-ico" aria-hidden>{ok ? "✓" : "✕"}</span>
            <div className="a-card-main">
              {link
                ? <a className="a-card-name" href={s.url} target="_blank" rel="noopener noreferrer">{s.name}</a>
                : <b className="a-card-name">{s.name}</b>}
              <span className="a-card-type">{TYPE[s.type]} · {ok ? "confirma" : "contradice"}</span>
            </div>
            <span className="a-card-pill">{ok ? "Confirma" : "Contradice"}</span>
          </li>
        );
      })}
    </ul>
  );

  return (
    <section className="a-section a-sources" aria-labelledby="a-src-h">
      <Reveal variant="blur">
        <span className="a-kicker">03 · Verificación</span>
        <h2 id="a-src-h" className="a-h2">Fuentes</h2>
      </Reveal>

      <Reveal variant="tilt" className="a-meter" delay={80} role="group" aria-label="Resumen de verificación de las fuentes">
        <div className="a-meter-bar" aria-hidden>
          {sources.map((s, i) => (
            <i key={i} className={`seg ${s.supports === "confirma" ? "ok" : "no"}`} style={vars({ "--i": i })} />
          ))}
        </div>
        <ul className="a-meter-stats">
          <li className="ok"><b>{confirm.length}</b><span>{confirm.length === 1 ? "fuente confirma" : "fuentes confirman"}</span></li>
          <li className={contra > 0 ? "no" : ""}><b>{contra}</b><span>{contra === 1 ? "fuente contradice" : "fuentes contradicen"}</span></li>
          <li><b>{independent}</b><span>{independent === 1 ? "medio independiente" : "medios independientes"}</span></li>
        </ul>
        <p className="a-meter-note">
          <VerificationBadge v={verification} />{" "}
          {note}{primary && contra === 0 && independent >= 2 ? " Incluye fuente primaria u oficial." : ""}
        </p>
      </Reveal>

      {n > 1 ? (
        // El abanico solo tiene sentido con varias fuentes; su recorrido crece con ellas.
        <ScrollScene height={`${Math.min(190, 110 + n * 20)}vh`} className="a-fan-scene" stageClassName="a-fan-stage">
          <p className="a-fan-cap">{n} fuentes · sigue bajando</p>
          {deck}
        </ScrollScene>
      ) : (
        <div className="a-fan-static">{deck}</div>
      )}
    </section>
  );
}
